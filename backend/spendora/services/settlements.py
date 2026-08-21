from spendora.db import get_db_connection
import datetime

def calculate_group_balances(group_id):
    """
    Calculates the net balance for each member in a group.
    Net Balance = (Total amount paid by user in group expenses) - (Total amount user is responsible for in splits).
    Positive balance means user is owed money (creditor).
    Negative balance means user owes money (debtor).
    """
    connection = get_db_connection()
    balances = {}
    try:
        with connection.cursor() as cursor:
            # Get all members of the group
            cursor.execute("SELECT user_id FROM group_members WHERE group_id = %s", (group_id,))
            members = [m['user_id'] for m in cursor.fetchall()]
            
            # Initialize balances to 0
            for m_id in members:
                balances[m_id] = 0.0

            # 1. Add up amounts paid by each user
            cursor.execute("""
                SELECT paid_by_id, SUM(amount) as total_paid 
                FROM group_expenses 
                WHERE group_id = %s 
                GROUP BY paid_by_id
            """, (group_id,))
            for row in cursor.fetchall():
                u_id = row['paid_by_id']
                if u_id in balances:
                    balances[u_id] += float(row['total_paid'])

            # 2. Subtract split amounts owed by each user
            cursor.execute("""
                SELECT es.user_id, SUM(es.amount) as total_owed 
                FROM expense_splits es
                JOIN group_expenses ge ON es.group_expense_id = ge.id
                WHERE ge.group_id = %s
                GROUP BY es.user_id
            """, (group_id,))
            for row in cursor.fetchall():
                u_id = row['user_id']
                if u_id in balances:
                    balances[u_id] -= float(row['total_owed'])

            # 3. Add up settlements already completed in this group (to offset balances)
            # If from_user paid to_user, then from_user's debt is reduced (balance increases),
            # and to_user's credit is reduced (balance decreases).
            cursor.execute("""
                SELECT from_user_id, to_user_id, SUM(amount) as total_settled 
                FROM settlements 
                WHERE group_id = %s AND status = 'completed'
                GROUP BY from_user_id, to_user_id
            """, (group_id,))
            for row in cursor.fetchall():
                from_u = row['from_user_id']
                to_u = row['to_user_id']
                amt = float(row['total_settled'])
                if from_u in balances:
                    balances[from_u] += amt # B pays A => B's balance goes up towards 0
                if to_u in balances:
                    balances[to_u] -= amt # A receives from B => A's balance goes down towards 0

        return balances
    finally:
        connection.close()

def optimize_settlements(group_id):
    """
    Greedy algorithm to minimize the number of transactions to settle debts in a group.
    Updates the settlements table with 'pending' settlements, deleting previous pending settlements.
    Does NOT modify 'completed' settlements.
    """
    balances = calculate_group_balances(group_id)
    
    # Separate into debtors and creditors
    debtors = []   # list of (user_id, balance) where balance is negative
    creditors = []  # list of (user_id, balance) where balance is positive

    for u_id, bal in balances.items():
        # Clean small rounding issues (less than 0.01)
        if abs(bal) < 0.01:
            continue
        if bal < 0:
            debtors.append((u_id, bal))
        else:
            creditors.append((u_id, bal))

    # Sort debtors ascending (most negative first) and creditors descending (most positive first)
    debtors.sort(key=lambda x: x[1])
    creditors.sort(key=lambda x: x[1], reverse=True)

    proposed_settlements = []

    d_idx = 0
    c_idx = 0

    while d_idx < len(debtors) and c_idx < len(creditors):
        d_user, d_bal = debtors[d_idx]
        c_user, c_bal = creditors[c_idx]

        # Amounts are absolute values for calculations
        debt_amount = abs(d_bal)
        credit_amount = c_bal

        settled_amount = min(debt_amount, credit_amount)
        if settled_amount >= 0.01:
            proposed_settlements.append({
                'from_user_id': d_user,
                'to_user_id': c_user,
                'amount': round(settled_amount, 2)
            })

        # Update remaining balances
        debtors[d_idx] = (d_user, d_bal + settled_amount)
        creditors[c_idx] = (c_user, c_bal - settled_amount)

        # Move indices if balances are resolved (near 0)
        if abs(debtors[d_idx][1]) < 0.01:
            d_idx += 1
        if abs(creditors[c_idx][1]) < 0.01:
            c_idx += 1

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 1. Clear existing pending settlements for the group
            cursor.execute("""
                DELETE FROM settlements 
                WHERE group_id = %s AND status = 'pending'
            """, (group_id,))

            # 2. Insert new pending settlements
            today = datetime.date.today().strftime('%Y-%m-%d')
            for s in proposed_settlements:
                cursor.execute("""
                    INSERT INTO settlements (group_id, from_user_id, to_user_id, amount, status, date)
                    VALUES (%s, %s, %s, %s, 'pending', %s)
                """, (group_id, s['from_user_id'], s['to_user_id'], s['amount'], today))
        return proposed_settlements
    finally:
        connection.close()
