#!/usr/bin/env python3
"""将网页端 JSON 数据同步回 Excel 源文件"""
import json
import sys
import os
import openpyxl
from datetime import datetime, timedelta, timezone

CN_TZ = timezone(timedelta(hours=8))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_EXCEL = os.path.join(
    BASE_DIR,
    '2026-06-27  618下单数据报表 任务分解 按部门(1).xlsx'
)
DEFAULT_JSON = os.path.join(BASE_DIR, 'data', 'latest.json')
SHEET_NAME = '2026年618活动'


def get_completed(emp, records):
    initial = float(emp.get('initialCompleted') or emp.get('snapshotCompleted') or 0)
    rec_sum = sum(
        float(r.get('amount') or 0) for r in records
        if r.get('employeeId') == emp['id']
    )
    return max(0, initial + rec_sum)


def build_record_notes(emp, records, report_date=''):
    """J 列仅记录填报流水，基准业绩只体现在 G 列总额"""
    emp_records = sorted(
        [r for r in records if r.get('employeeId') == emp['id']],
        key=lambda r: r.get('timestamp', '')
    )
    if not emp_records:
        baseline = float(emp.get('initialCompleted') or 0)
        if baseline > 0 and report_date:
            return f'基准({report_date}) {int(baseline)}'
        return None

    lines = []
    for r in emp_records:
        ts = (r.get('timestamp') or '')[:10]
        amt = float(r.get('amount') or 0)
        note = (r.get('note') or '').strip()
        sign = '+' if amt > 0 else ''
        part = f'{ts} {sign}{int(amt)}'
        if note:
            part += f' {note}'
        lines.append(part.strip())
    return ' '.join(lines) if lines else None


def sync_excel(data, excel_path=None):
    excel_path = excel_path or DEFAULT_EXCEL
    if not os.path.isfile(excel_path):
        raise FileNotFoundError(f'Excel 文件不存在: {excel_path}')

    employees = {e['id']: e for e in data.get('employees', [])}
    records = data.get('records', [])
    report_date = (data.get('reportDate') or '')[:10]

    wb = openpyxl.load_workbook(excel_path)
    if SHEET_NAME not in wb.sheetnames:
        raise ValueError(f'找不到工作表: {SHEET_NAME}')
    ws = wb[SHEET_NAME]

    updated = 0
    skip_names = {'魏瑞', '小计', '总合计'}
    matched = set()

    for row in range(3, ws.max_row + 1):
        name = ws.cell(row, 4).value
        if not name:
            continue
        name = str(name).strip()
        if name in skip_names or '合计' in name:
            continue
        if name not in employees:
            continue

        matched.add(name)
        emp = employees[name]
        completed = get_completed(emp, records)
        ws.cell(row, 7).value = completed if completed else None

        notes = build_record_notes(emp, records, report_date)
        ws.cell(row, 10).value = notes  # 无备注时清空旧数据

        if emp.get('target') is not None:
            ws.cell(row, 5).value = emp['target']

        updated += 1

    # 网页新增、Excel 尚无的员工：按名册顺序插入到前一位同事下方
    emp_list = data.get('employees', [])
    name_to_idx = {e['name']: i for i, e in enumerate(emp_list)}
    inserted = 0

    def find_row_by_name(target):
        for r in range(3, ws.max_row + 1):
            val = ws.cell(r, 4).value
            if val and str(val).strip() == target:
                return r
        return None

    def write_employee_row(row, emp):
        completed = get_completed(emp, records)
        ws.cell(row, 1).value = emp.get('seq')
        ws.cell(row, 4).value = emp['name']
        if emp.get('target') is not None:
            ws.cell(row, 5).value = emp['target']
        ws.cell(row, 7).value = completed if completed else None
        notes = build_record_notes(emp, records, report_date)
        ws.cell(row, 10).value = notes

    for emp in emp_list:
        name = emp['name']
        if name in matched or name in skip_names:
            continue
        idx = name_to_idx.get(name, -1)
        anchor_row = None
        for j in range(idx - 1, -1, -1):
            prev_name = emp_list[j]['name']
            anchor_row = find_row_by_name(prev_name)
            if anchor_row:
                break
        if not anchor_row:
            continue
        insert_at = anchor_row + 1
        ws.insert_rows(insert_at)
        write_employee_row(insert_at, emp)
        matched.add(name)
        updated += 1
        inserted += 1

    wb.save(excel_path)
    return {'updated': updated, 'inserted': inserted, 'path': excel_path, 'savedAt': datetime.now(CN_TZ).isoformat(timespec='seconds')}


def main():
    json_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_JSON
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)
    data.setdefault('records', [])

    excel_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_EXCEL
    result = sync_excel(data, excel_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
