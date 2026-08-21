from flask import Blueprint, jsonify, request, g, make_response
from spendora.db import get_db_connection
from spendora.middleware.auth import token_required
import datetime
import io

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/summary', methods=['GET'])
@token_required
def get_summary():
    """
    Computes key summary cards for the user dashboard:
    - Total balance (all-time)
    - All-time income & expenses
    - Current month income & expenses
    - Current month budget details
    - Active groups count
    """
    now = datetime.datetime.now()
    month = now.month
    year = now.year

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # 1. Total Income (All-Time)
            cursor.execute("SELECT SUM(amount) AS total_inc FROM income WHERE user_id = %s", (g.current_user['id'],))
            total_income = float(cursor.fetchone()['total_inc'] or 0.0)

            # 2. Total Expenses (All-Time)
            cursor.execute("SELECT SUM(amount) AS total_exp FROM expenses WHERE user_id = %s", (g.current_user['id'],))
            total_expenses = float(cursor.fetchone()['total_exp'] or 0.0)

            # 3. Income (Current Month)
            cursor.execute("""
                SELECT SUM(amount) AS month_inc FROM income 
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
            """, (g.current_user['id'], month, year))
            month_income = float(cursor.fetchone()['month_inc'] or 0.0)

            # 4. Expenses (Current Month)
            cursor.execute("""
                SELECT SUM(amount) AS month_exp FROM expenses 
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
            """, (g.current_user['id'], month, year))
            month_expenses = float(cursor.fetchone()['month_exp'] or 0.0)

            # 5. Budget (Current Month)
            cursor.execute("""
                SELECT amount FROM budgets 
                WHERE user_id = %s AND month = %s AND year = %s
            """, (g.current_user['id'], month, year))
            budget_row = cursor.fetchone()
            current_budget = float(budget_row['amount']) if budget_row else 0.0

            # 6. Active Groups count
            cursor.execute("SELECT COUNT(*) AS group_count FROM group_members WHERE user_id = %s", (g.current_user['id'],))
            active_groups = int(cursor.fetchone()['group_count'] or 0)

            total_balance = total_income - total_expenses
            remaining_budget = current_budget - month_expenses if current_budget > 0 else 0.0
            savings = total_balance # simple definition: income - expenses

            return jsonify({
                'total_balance': total_balance,
                'total_income': total_income,
                'total_expenses': total_expenses,
                'month_income': month_income,
                'month_expenses': month_expenses,
                'monthly_income': month_income,
                'monthly_spent': month_expenses,
                'current_monthly_budget': current_budget,
                'remaining_monthly_budget': remaining_budget,
                'savings': savings,
                'active_groups': active_groups
            }), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@reports_bp.route('/category', methods=['GET'])
@token_required
def get_category_distribution():
    """
    Computes category-wise expense totals for a given date range or the current month.
    """
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            sql = """
                SELECT c.name AS category_name, SUM(e.amount) AS total_amount, c.id AS category_id
                FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = %s
            """
            params = [g.current_user['id']]

            if start_date:
                sql += " AND e.date >= %s"
                params.append(start_date)
            else:
                # default to current month start
                now = datetime.datetime.now()
                first_day = now.replace(day=1).strftime('%Y-%m-%d')
                sql += " AND e.date >= %s"
                params.append(first_day)

            if end_date:
                sql += " AND e.date <= %s"
                params.append(end_date)

            sql += " GROUP BY c.id, c.name ORDER BY total_amount DESC"
            cursor.execute(sql, tuple(params))
            distribution = cursor.fetchall()
            
            # Format numbers to float
            for item in distribution:
                item['total_amount'] = float(item['total_amount'])

            return jsonify({'distribution': distribution}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@reports_bp.route('/monthly', methods=['GET'])
@token_required
def get_monthly_trends():
    """
    Fetches monthly income vs expenses for the current year.
    Returns array of objects: [{'month': 'Jan', 'income': 5000, 'expense': 3000}]
    """
    year = request.args.get('year', datetime.datetime.now().year)

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Monthly expenses
            cursor.execute("""
                SELECT MONTH(date) AS mth, SUM(amount) AS amt 
                FROM expenses 
                WHERE user_id = %s AND YEAR(date) = %s
                GROUP BY MONTH(date)
            """, (g.current_user['id'], year))
            expenses_raw = {item['mth']: float(item['amt']) for item in cursor.fetchall()}

            # Monthly income
            cursor.execute("""
                SELECT MONTH(date) AS mth, SUM(amount) AS amt 
                FROM income 
                WHERE user_id = %s AND YEAR(date) = %s
                GROUP BY MONTH(date)
            """, (g.current_user['id'], year))
            income_raw = {item['mth']: float(item['amt']) for item in cursor.fetchall()}

            # Combine into 12 months list
            month_names = {
                1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
                7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
            }

            trends = []
            for m in range(1, 13):
                trends.append({
                    'month_num': m,
                    'month': month_names[m],
                    'income': income_raw.get(m, 0.0),
                    'expense': expenses_raw.get(m, 0.0)
                })

            return jsonify({'trends': trends}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@reports_bp.route('/notifications', methods=['GET'])
@token_required
def get_notifications():
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC", (g.current_user['id'],))
            notifs = cursor.fetchall()
            for n in notifs:
                if n['created_at']:
                    n['created_at'] = n['created_at'].strftime('%Y-%m-%d %H:%M:%S')
            return jsonify({'notifications': notifs}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@reports_bp.route('/notifications/read-all', methods=['PUT'])
@token_required
def read_all_notifications():
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE notifications SET is_read = TRUE WHERE user_id = %s", (g.current_user['id'],))
            return jsonify({'message': 'All notifications marked as read.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@reports_bp.route('/notifications/<int:notif_id>', methods=['PUT'])
@token_required
def read_single_notification(notif_id):
    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s", (notif_id, g.current_user['id']))
            return jsonify({'message': 'Notification marked as read.'}), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()

@reports_bp.route('/export-pdf', methods=['GET'])
@token_required
def export_pdf():
    """
    Generates and downloads a complete Monthly Expense Report PDF statement for the current user.
    Query params:
    - month: int (1-12, default current month)
    - year: int (default current year)
    """
    now = datetime.datetime.now()
    try:
        month = int(request.args.get('month', now.month))
        year = int(request.args.get('year', now.year))
    except ValueError:
        month = now.month
        year = now.year

    if month < 1 or month > 12:
        month = now.month
    if year < 2000 or year > 2100:
        year = now.year

    month_name = datetime.date(year, month, 1).strftime('%B')

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Get user info
            cursor.execute("SELECT full_name, email FROM users WHERE id = %s", (g.current_user['id'],))
            user_row = cursor.fetchone()
            user_info = {
                'name': user_row['full_name'] if user_row and user_row.get('full_name') else g.current_user.get('full_name', g.current_user.get('name', 'User')),
                'email': user_row['email'] if user_row and user_row.get('email') else g.current_user.get('email', '')
            }

            # Income for month
            cursor.execute("""
                SELECT SUM(amount) AS total FROM income 
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
            """, (g.current_user['id'], month, year))
            total_income = float(cursor.fetchone()['total'] or 0.0)

            # Expenses for month
            cursor.execute("""
                SELECT SUM(amount) AS total FROM expenses 
                WHERE user_id = %s AND MONTH(date) = %s AND YEAR(date) = %s
            """, (g.current_user['id'], month, year))
            total_expenses = float(cursor.fetchone()['total'] or 0.0)

            # Budget for month
            cursor.execute("""
                SELECT amount FROM budgets 
                WHERE user_id = %s AND month = %s AND year = %s
            """, (g.current_user['id'], month, year))
            budget_row = cursor.fetchone()
            budget_amount = float(budget_row['amount']) if budget_row else 0.0

            # Expenses by category
            cursor.execute("""
                SELECT c.name AS category_name, SUM(e.amount) AS total_amount, COUNT(e.id) AS tx_count
                FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = %s AND MONTH(e.date) = %s AND YEAR(e.date) = %s
                GROUP BY c.id, c.name
                ORDER BY total_amount DESC
            """, (g.current_user['id'], month, year))
            categories_raw = cursor.fetchall()

            categories_summary = []
            for cat in categories_raw:
                tot = float(cat['total_amount'])
                pct = (tot / total_expenses * 100) if total_expenses > 0 else 0
                categories_summary.append({
                    'name': cat['category_name'],
                    'count': cat['tx_count'],
                    'total': tot,
                    'pct': pct
                })

            # Itemized expense list
            cursor.execute("""
                SELECT e.id, e.date, e.description, e.amount, e.payment_method, c.name AS category_name
                FROM expenses e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = %s AND MONTH(e.date) = %s AND YEAR(e.date) = %s
                ORDER BY e.date ASC, e.id ASC
            """, (g.current_user['id'], month, year))
            expense_items = cursor.fetchall()

            for item in expense_items:
                item['amount'] = float(item['amount'])
                if isinstance(item['date'], (datetime.date, datetime.datetime)):
                    item['date_str'] = item['date'].strftime('%Y-%m-%d')
                else:
                    item['date_str'] = str(item['date'])


        # Now construct the PDF with ReportLab
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom Paragraph Styles
        brand_style = ParagraphStyle(
            'BrandHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#4f46e5')
        )
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=15,
            leading=18,
            textColor=colors.HexColor('#0f172a')
        )
        meta_style = ParagraphStyle(
            'DocMeta',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#64748b')
        )
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=15,
            textColor=colors.HexColor('#1e293b'),
            spaceBefore=12,
            spaceAfter=6
        )
        cell_style = ParagraphStyle(
            'CellText',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=11,
            textColor=colors.HexColor('#334155')
        )
        cell_bold = ParagraphStyle(
            'CellBoldText',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11,
            textColor=colors.HexColor('#0f172a')
        )
        table_header_style = ParagraphStyle(
            'TableHeaderText',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=11,
            textColor=colors.white
        )

        story = []

        # 1. Header Banner
        header_data = [
            [
                Paragraph("<b>SPENDORA</b>", brand_style),
                Paragraph(f"<b>MONTHLY FINANCIAL STATEMENT</b><br/><font color='#64748b' size=9>{month_name} {year}</font>", title_style)
            ]
        ]
        header_table = Table(header_data, colWidths=[2.5*inch, 4.5*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (1,0), (1,0), 'RIGHT'),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))

        # Metadata Row
        gen_time = now.strftime('%Y-%m-%d %H:%M:%S')
        user_display = f"{user_info.get('name', 'User')} ({user_info.get('email', '')})"
        meta_p = Paragraph(f"<b>Account:</b> {user_display} &nbsp;|&nbsp; <b>Generated:</b> {gen_time}", meta_style)
        story.append(meta_p)
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#e2e8f0'), spaceBefore=2, spaceAfter=12))

        # 2. Executive Summary Cards (Table)
        net_savings = total_income - total_expenses
        budget_utilization = (total_expenses / budget_amount * 100) if budget_amount > 0 else 0
        budget_status_str = f"{budget_utilization:.1f}% used" if budget_amount > 0 else "No limit set"

        summary_data = [
            [
                Paragraph("<b>TOTAL INCOME</b>", meta_style),
                Paragraph("<b>TOTAL EXPENSES</b>", meta_style),
                Paragraph("<b>NET SAVINGS</b>", meta_style),
                Paragraph("<b>BUDGET CAP</b>", meta_style)
            ],
            [
                Paragraph(f"<font color='#059669'><b>INR {total_income:,.2f}</b></font>", ParagraphStyle('Inc', parent=title_style, fontSize=13, textColor=colors.HexColor('#059669'))),
                Paragraph(f"<font color='#dc2626'><b>INR {total_expenses:,.2f}</b></font>", ParagraphStyle('Exp', parent=title_style, fontSize=13, textColor=colors.HexColor('#dc2626'))),
                Paragraph(f"<font color='{'#059669' if net_savings >= 0 else '#dc2626'}'><b>INR {net_savings:,.2f}</b></font>", ParagraphStyle('Sav', parent=title_style, fontSize=13)),
                Paragraph(f"<b>INR {budget_amount:,.2f}</b><br/><font size=7 color='#64748b'>({budget_status_str})</font>", cell_style)
            ]
        ]
        summary_table = Table(summary_data, colWidths=[1.75*inch, 1.75*inch, 1.75*inch, 1.75*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('PADDING', (0,0), (-1,-1), 8),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 16))

        # 3. Category Breakdown Table
        story.append(Paragraph("Category Spending Breakdown", section_style))
        if categories_summary:
            cat_table_data = [
                [
                    Paragraph("Category", table_header_style),
                    Paragraph("Tx Count", table_header_style),
                    Paragraph("Total Amount", table_header_style),
                    Paragraph("Share (%)", table_header_style)
                ]
            ]
            for c in categories_summary:
                cat_table_data.append([
                    Paragraph(f"<b>{c['name']}</b>", cell_bold),
                    Paragraph(str(c['count']), cell_style),
                    Paragraph(f"INR {c['total']:,.2f}", cell_bold),
                    Paragraph(f"{c['pct']:.1f}%", cell_style)
                ])

            cat_table = Table(cat_table_data, colWidths=[2.5*inch, 1.2*inch, 1.8*inch, 1.5*inch])
            cat_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(cat_table)
        else:
            story.append(Paragraph("<i>No expenses logged for this month.</i>", cell_style))

        story.append(Spacer(1, 16))

        # 4. Itemized Expenses List Table
        story.append(Paragraph(f"Itemized Expenses ({len(expense_items)} transactions)", section_style))
        if expense_items:
            tx_table_data = [
                [
                    Paragraph("Date", table_header_style),
                    Paragraph("Title / Description", table_header_style),
                    Paragraph("Category", table_header_style),
                    Paragraph("Payment Method", table_header_style),
                    Paragraph("Amount", table_header_style)
                ]
            ]
            for exp in expense_items:
                tx_table_data.append([
                    Paragraph(exp['date_str'], cell_style),
                    Paragraph(exp.get('description', ''), cell_bold),
                    Paragraph(exp['category_name'], cell_style),
                    Paragraph(exp.get('payment_method') or 'N/A', cell_style),
                    Paragraph(f"<font color='#dc2626'>-INR {exp['amount']:,.2f}</font>", ParagraphStyle('ExpAmt', parent=cell_bold, alignment=2))
                ])

            tx_table = Table(tx_table_data, colWidths=[1.1*inch, 2.3*inch, 1.3*inch, 1.1*inch, 1.2*inch])
            tx_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4f46e5')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('PADDING', (0,0), (-1,-1), 5),
            ]))
            story.append(tx_table)
        else:
            story.append(Paragraph("<i>No itemized expense records found for this period.</i>", cell_style))

        # 5. Footer note
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceBefore=6, spaceAfter=8))
        story.append(Paragraph("<i>Spendora AI Expense Manager &bull; Confidential Personal Financial Report</i>", ParagraphStyle('Foot', parent=meta_style, alignment=1)))

        doc.build(story)
        pdf_val = buffer.getvalue()
        buffer.close()

        response = make_response(pdf_val)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="Spendora_Monthly_Report_{year}_{month:02d}.pdf"'
        return response

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Failed to generate PDF report: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()


