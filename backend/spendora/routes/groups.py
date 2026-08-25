from flask import Blueprint, request, jsonify, g
from spendora.db import get_db_connection
from spendora.middleware.auth import token_required
from spendora.services.audit import log_activity
from spendora.services.settlements import optimize_settlements
import datetime

groups_bp = Blueprint('groups', __name__)

# ==========================================
# GROUP CRUD
# ==========================================

@groups_bp.route('', methods=['POST'])
@token_required
def create_group():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()

    if not name:
        return jsonify({'message': 'Group name is required.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Insert Group
            sql = "INSERT INTO groups (name, description, creator_id) VALUES (?, ?, ?)"
            cursor.execute(sql, (name, description, g.current_user['id']))
            group_id = cursor.lastrowid

            # 2. Add Creator to Group Members
            cursor.execute("""
                INSERT INTO group_members (group_id, user_id) 
                VALUES (?, ?)
            """, (group_id, g.current_user['id']))

            log_activity(g.current_user['id'], 'GROUP_CREATE', f'Created group: {name} (ID: {group_id})', request.remote_addr)

            return jsonify({
                'message': 'Group created successfully.',
                'group': {
                    'id': group_id,
                    'name': name,
                    'description': description,
                    'creator_id': g.current_user['id']
                }
            }), 201
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@groups_bp.route('', methods=['GET'])
@token_required
def get_groups():
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Get groups where current user is a member
            sql = """
                SELECT g.*, u.full_name AS creator_name,
                (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
                FROM groups g
                JOIN group_members gm ON g.id = gm.group_id
                JOIN users u ON g.creator_id = u.id
                WHERE gm.user_id = ?
                ORDER BY g.created_at DESC
            """
            cursor.execute(sql, (g.current_user['id'],))
            groups = cursor.fetchall()
            return jsonify({'groups': groups}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@groups_bp.route('/<int:group_id>', methods=['GET'])
@token_required
def get_group_by_id(group_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Verify user is a member
            cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, g.current_user['id']))
            if not cursor.fetchone():
                return jsonify({'message': 'Group not found or unauthorized.'}), 404

            # Fetch Group Info
            cursor.execute("""
                SELECT g.*, u.full_name AS creator_name 
                FROM groups g
                JOIN users u ON g.creator_id = u.id
                WHERE g.id = ?
            """, (group_id,))
            group = cursor.fetchone()

            # Fetch Group Members
            cursor.execute("""
                SELECT u.id, u.full_name, u.email, gm.joined_at 
                FROM group_members gm
                JOIN users u ON gm.user_id = u.id
                WHERE gm.group_id = ?
            """, (group_id,))
            members = cursor.fetchall()

            # Fetch Group Expenses
            cursor.execute("""
                SELECT ge.*, u.full_name AS paid_by_name, c.name AS category_name 
                FROM group_expenses ge
                JOIN users u ON ge.paid_by_id = u.id
                JOIN categories c ON ge.category_id = c.id
                WHERE ge.group_id = ?
                ORDER BY ge.date DESC, ge.created_at DESC
            """, (group_id,))
            expenses = cursor.fetchall()

            # Fetch Settlements (pending and completed)
            cursor.execute("""
                SELECT s.*, f.full_name AS from_user_name, t.full_name AS to_user_name 
                FROM settlements s
                JOIN users f ON s.from_user_id = f.id
                JOIN users t ON s.to_user_id = t.id
                WHERE s.group_id = ?
                ORDER BY s.status DESC, s.amount DESC
            """, (group_id,))
            settlements = cursor.fetchall()

            return jsonify({
                'group': group,
                'members': members,
                'expenses': expenses,
                'settlements': settlements
            }), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

# ==========================================
# GROUP MEMBERS MANAGEMENT
# ==========================================

@groups_bp.route('/<int:group_id>/members', methods=['POST'])
@token_required
def add_group_member(group_id):
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({'message': 'User email is required.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Verify caller is a member of this group
            cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, g.current_user['id']))
            if not cursor.fetchone():
                return jsonify({'message': 'Group not found or unauthorized.'}), 404

            # 2. Find target user or auto-provision account if not registered yet
            cursor.execute("SELECT id, full_name FROM users WHERE email = ?", (email,))
            user = cursor.fetchone()
            if not user:
                import bcrypt
                name_part = email.split('@')[0].replace('.', ' ').replace('_', ' ').replace('-', ' ').title()
                if not name_part:
                    name_part = "Group Member"
                
                pass_hash = bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cursor.execute("""
                    INSERT INTO users (full_name, email, password_hash, role, status)
                    VALUES (?, ?, ?, 'USER', 'active')
                """, (name_part, email, pass_hash))
                new_user_id = cursor.lastrowid
                user = {'id': new_user_id, 'full_name': name_part}

            # 3. Check if user is already a member
            cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user['id']))
            if cursor.fetchone():
                return jsonify({'message': 'User is already a member of this group.'}), 400

            # 4. Insert member
            cursor.execute("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", (group_id, user['id']))

            # Log & Recalculate
            log_activity(g.current_user['id'], 'GROUP_ADD_MEMBER', f'Added user ID {user["id"]} to group {group_id}', request.remote_addr)
            optimize_settlements(group_id)

            return jsonify({'message': f'{user["full_name"]} added to group successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@groups_bp.route('/<int:group_id>/members/<int:user_id>', methods=['DELETE'])
@token_required
def remove_group_member(group_id, user_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Verify caller is creator or the member leaving
            cursor.execute("SELECT creator_id FROM groups WHERE id = ?", (group_id,))
            group = cursor.fetchone()
            if not group:
                return jsonify({'message': 'Group not found.'}), 404

            is_creator = group['creator_id'] == g.current_user['id']
            is_self = user_id == g.current_user['id']

            if not is_creator and not is_self:
                return jsonify({'message': 'Unauthorized to remove members.'}), 403

            # 2. Check if target user is in the group
            cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user_id))
            if not cursor.fetchone():
                return jsonify({'message': 'Member not found in this group.'}), 404

            # 3. Prevent creator from leaving unless they delete the group
            if is_self and is_creator:
                return jsonify({'message': 'As group creator, you cannot leave the group. Delete it instead.'}), 400

            # 4. Remove member
            cursor.execute("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, user_id))

            log_activity(g.current_user['id'], 'GROUP_REMOVE_MEMBER', f'Removed user ID {user_id} from group {group_id}', request.remote_addr)
            optimize_settlements(group_id)

            return jsonify({'message': 'Member removed successfully.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

# ==========================================
# GROUP EXPENSES MANAGEMENT
# ==========================================

@groups_bp.route('/<int:group_id>/expenses', methods=['POST'])
@token_required
def add_group_expense(group_id):
    data = request.get_json() or {}
    description = data.get('description', '').strip()
    amount = data.get('amount')
    paid_by_id = data.get('paid_by_id')
    category_id = data.get('category_id')
    date_str = data.get('date', '').strip()
    split_method = data.get('split_method', 'equal')
    splits = data.get('splits', []) # Expects list of dicts: [{'user_id': 2, 'amount': 100, 'percentage': 33.3}]

    if not description or not amount or not paid_by_id or not category_id or not date_str:
        return jsonify({'message': 'Description, amount, paid_by_id, category_id, and date are required.'}), 400

    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({'message': 'Expense amount must be greater than zero.'}), 400
    except ValueError:
        return jsonify({'message': 'Amount must be numeric.'}), 400

    try:
        date_val = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Verify caller is group member
            cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, g.current_user['id']))
            if not cursor.fetchone():
                return jsonify({'message': 'Group not found or unauthorized.'}), 404

            # 2. Verify paid_by_id is member
            cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, paid_by_id))
            if not cursor.fetchone():
                return jsonify({'message': 'Payer must be a group member.'}), 400

            # 3. Verify category
            cursor.execute("SELECT id FROM categories WHERE id = ?", (category_id,))
            if not cursor.fetchone():
                return jsonify({'message': 'Invalid category.'}), 400

            # 4. Perform Split Validations
            calculated_splits = []
            if split_method == 'equal':
                if not splits:
                    cursor.execute("SELECT user_id FROM group_members WHERE group_id = ?", (group_id,))
                    splits = [{'user_id': row['user_id']} for row in cursor.fetchall()]

                num_members = len(splits)
                split_amount = round(amount_val / num_members, 2)
                split_percent = round(100.0 / num_members, 2)

                accumulated = 0.00
                for idx, sp in enumerate(splits):
                    u_id = sp['user_id']
                    cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, u_id))
                    if not cursor.fetchone():
                        return jsonify({'message': f'Participant ID {u_id} is not a member of the group.'}), 400
                    
                    current_amt = split_amount
                    if idx == num_members - 1:
                        current_amt = round(amount_val - accumulated, 2)
                    accumulated += current_amt

                    calculated_splits.append({
                        'user_id': u_id,
                        'amount': current_amt,
                        'percentage': split_percent
                    })
            
            elif split_method == 'custom':
                if not splits:
                    return jsonify({'message': 'Splits details must be provided for custom splitting.'}), 400

                total_split_sum = 0.00
                for sp in splits:
                    u_id = sp.get('user_id')
                    sp_amt = float(sp.get('amount', 0))
                    if sp_amt < 0:
                        return jsonify({'message': 'Split amounts cannot be negative.'}), 400

                    cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, u_id))
                    if not cursor.fetchone():
                        return jsonify({'message': f'Participant ID {u_id} is not a member of the group.'}), 400

                    total_split_sum += sp_amt
                    calculated_splits.append({
                        'user_id': u_id,
                        'amount': round(sp_amt, 2),
                        'percentage': round((sp_amt / amount_val) * 100.0, 2) if amount_val > 0 else 0
                    })

                if abs(total_split_sum - amount_val) > 0.05:
                    return jsonify({'message': f'Split total (₹{total_split_sum:.2f}) does not match expense amount (₹{amount_val:.2f}).'}), 400

            elif split_method == 'percentage':
                if not splits:
                    return jsonify({'message': 'Splits details must be provided for percentage splitting.'}), 400

                total_percent_sum = 0.00
                accumulated_amt = 0.00
                for idx, sp in enumerate(splits):
                    u_id = sp.get('user_id')
                    pct = float(sp.get('percentage', 0))
                    if pct < 0:
                        return jsonify({'message': 'Percentages cannot be negative.'}), 400

                    cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, u_id))
                    if not cursor.fetchone():
                        return jsonify({'message': f'Participant ID {u_id} is not a member of the group.'}), 400

                    total_percent_sum += pct
                    
                    sp_amt = round((pct / 100.0) * amount_val, 2)
                    if idx == len(splits) - 1 and abs(total_percent_sum - 100.0) < 0.05:
                        sp_amt = round(amount_val - accumulated_amt, 2)
                    accumulated_amt += sp_amt

                    calculated_splits.append({
                        'user_id': u_id,
                        'amount': sp_amt,
                        'percentage': round(pct, 2)
                    })

                if abs(total_percent_sum - 100.0) > 0.05:
                    return jsonify({'message': f'Total percentage ({total_percent_sum:.2f}%) must equal 100%.'}), 400

            # 5. Insert Group Expense
            sql = """
                INSERT INTO group_expenses (group_id, description, amount, paid_by_id, category_id, date, split_method)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            cursor.execute(sql, (group_id, description, amount_val, paid_by_id, category_id, str(date_val), split_method))
            expense_id = cursor.lastrowid

            # 6. Insert splits into database
            for cs in calculated_splits:
                cursor.execute("""
                    INSERT INTO expense_splits (group_expense_id, user_id, amount, percentage)
                    VALUES (?, ?, ?, ?)
                """, (expense_id, cs['user_id'], cs['amount'], cs['percentage']))

            # Recalculate group settlements
            optimize_settlements(group_id)

            log_activity(g.current_user['id'], 'GROUP_EXPENSE_ADD', f'Added expense: {description} (Total: {amount_val}) to group {group_id}', request.remote_addr)

            return jsonify({
                'message': 'Group expense added and settled.',
                'expense_id': expense_id
            }), 201
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@groups_bp.route('/<int:group_id>/expenses/<int:expense_id>', methods=['DELETE'])
@token_required
def delete_group_expense(group_id, expense_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Verify caller membership
            cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, g.current_user['id']))
            if not cursor.fetchone():
                return jsonify({'message': 'Group not found or unauthorized.'}), 404

            # 2. Check expense exists and belongs to group
            cursor.execute("SELECT * FROM group_expenses WHERE id = ? AND group_id = ?", (expense_id, group_id))
            expense = cursor.fetchone()
            if not expense:
                return jsonify({'message': 'Expense not found.'}), 404

            # 3. Delete expense (database cascading deletes splits automatically)
            cursor.execute("DELETE FROM group_expenses WHERE id = ?", (expense_id,))

            # Recalculate remaining settlements
            optimize_settlements(group_id)

            log_activity(g.current_user['id'], 'GROUP_EXPENSE_DELETE', f'Deleted expense ID {expense_id} ({expense["description"]}) from group {group_id}', request.remote_addr)
            return jsonify({'message': 'Group expense deleted.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

# ==========================================
# SETTLEMENTS RECORDING
# ==========================================

@groups_bp.route('/<int:group_id>/settlements', methods=['GET'])
@token_required
def get_group_settlements(group_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Verify membership
            cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, g.current_user['id']))
            if not cursor.fetchone():
                return jsonify({'message': 'Group not found or unauthorized.'}), 404

            # Fetch settlements
            cursor.execute("""
                SELECT s.*, f.full_name AS from_user_name, t.full_name AS to_user_name 
                FROM settlements s
                JOIN users f ON s.from_user_id = f.id
                JOIN users t ON s.to_user_id = t.id
                WHERE s.group_id = ?
                ORDER BY s.status DESC, s.amount DESC
            """, (group_id,))
            settlements = cursor.fetchall()
            return jsonify({'settlements': settlements}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@groups_bp.route('/<int:group_id>/settlements', methods=['POST'])
@token_required
def record_settlement(group_id):
    """
    Manually record a settlement from one user to another.
    This creates a COMPLETED settlement immediately, which updates balances.
    """
    data = request.get_json() or {}
    from_user_id = data.get('from_user_id')
    to_user_id = data.get('to_user_id')
    amount = data.get('amount')

    if not from_user_id or not to_user_id or not amount:
        return jsonify({'message': 'From user, to user, and amount are required.'}), 400

    try:
        amount_val = float(amount)
        if amount_val <= 0:
            return jsonify({'message': 'Amount must be greater than zero.'}), 400
    except ValueError:
        return jsonify({'message': 'Amount must be numeric.'}), 400

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Verify caller membership
            cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, g.current_user['id']))
            if not cursor.fetchone():
                return jsonify({'message': 'Group not found or unauthorized.'}), 404

            # Verify settlement participants membership
            cursor.execute("SELECT user_id FROM group_members WHERE group_id = ? AND user_id IN (?, ?)", (group_id, from_user_id, to_user_id))
            if len(cursor.fetchall()) < 2 and from_user_id != to_user_id:
                return jsonify({'message': 'Both participants must be members of the group.'}), 400

            today = datetime.date.today().strftime('%Y-%m-%d')
            cursor.execute("""
                INSERT INTO settlements (group_id, from_user_id, to_user_id, amount, status, date)
                VALUES (?, ?, ?, ?, 'completed', ?)
            """, (group_id, from_user_id, to_user_id, amount_val, today))

            # Recalculate other pending debts (incorporating this payment)
            optimize_settlements(group_id)

            log_activity(g.current_user['id'], 'SETTLEMENT_RECORD', f'Recorded manual settlement in group {group_id}: User {from_user_id} paid {to_user_id} - ₹{amount_val}', request.remote_addr)
            return jsonify({'message': 'Settlement recorded and finalized.'}), 201
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

# Mounted at /api/settlements/:id
@groups_bp.route('/settlements/<int:settlement_id>', methods=['PUT'])
@token_required
def mark_settlement_completed(settlement_id):
    """
    Updates the status of a specific settlement to 'completed'.
    Triggers settlement recalculation to offset remaining balances.
    """
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Fetch settlement details
            cursor.execute("SELECT * FROM settlements WHERE id = ?", (settlement_id,))
            settlement = cursor.fetchone()
            if not settlement:
                return jsonify({'message': 'Settlement not found.'}), 404

            group_id = settlement['group_id']

            # Verify caller membership in the group
            cursor.execute("SELECT * FROM group_members WHERE group_id = ? AND user_id = ?", (group_id, g.current_user['id']))
            if not cursor.fetchone():
                return jsonify({'message': 'Unauthorized access.'}), 403

            # Update status
            cursor.execute("UPDATE settlements SET status = 'completed' WHERE id = ?", (settlement_id,))

            # Recalculate remaining pending debts
            optimize_settlements(group_id)

            log_activity(g.current_user['id'], 'SETTLEMENT_COMPLETE', f'Marked settlement ID {settlement_id} completed in group {group_id}', request.remote_addr)
            return jsonify({'message': 'Settlement marked as completed.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
