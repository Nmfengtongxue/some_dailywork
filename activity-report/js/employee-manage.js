/**
 * 人员名册 CRUD — 增删改、指定位置插入
 */
const EmployeeManage = {
  _deptMeta: {
    '销售部': { director: '陈炳森', manager: '' },
    '行政部': { director: '范宏云', manager: '范宏云' },
    '医疗中心': { director: '张静', manager: '张静' }
  },

  guessPinyin(name) {
    // 简易首字母（新增人员搜索兜底；完整拼音可后续 API 补充）
    return { pinyin: name, initials: name.slice(0, 3) };
  },

  openModal(mode, employeeId, afterEmployeeId) {
    const modal = document.getElementById('empModal');
    const emp = employeeId ? Store.getEmployees().find(e => e.id === employeeId) : null;
    const afterEmp = afterEmployeeId ? Store.getEmployees().find(e => e.id === afterEmployeeId) : null;

    document.getElementById('empModalTitle').textContent =
      mode === 'edit' ? `编辑人员 — ${emp?.name || ''}` :
      mode === 'insert' ? `在「${afterEmp?.name || ''}」下方插入` : '新增人员';

    document.getElementById('empFormMode').value = mode;
    document.getElementById('empFormId').value = employeeId || '';
    document.getElementById('empFormAfter').value = afterEmployeeId || '';

    document.getElementById('empName').value = emp?.name || '';
    document.getElementById('empDept').value = emp?.department || afterEmp?.department || '医疗中心';
    document.getElementById('empTarget').value = emp?.target ?? (afterEmp?.target || 3000);
    document.getElementById('empBaseline').value = emp?.initialCompleted ?? 0;
    document.getElementById('empDirector').value = emp?.director || '';
    document.getElementById('empManager').value = emp?.manager || '';

    modal.classList.add('show');
  },

  closeModal() {
    document.getElementById('empModal').classList.remove('show');
  },

  submitForm() {
    const mode = document.getElementById('empFormMode').value;
    const id = document.getElementById('empFormId').value;
    const afterId = document.getElementById('empFormAfter').value;
    const name = document.getElementById('empName').value.trim();
    const department = document.getElementById('empDept').value;
    const target = Number(document.getElementById('empTarget').value);
    const initialCompleted = Number(document.getElementById('empBaseline').value) || 0;
    let director = document.getElementById('empDirector').value.trim();
    let manager = document.getElementById('empManager').value.trim();

    if (!name) { App.toast('请输入姓名'); return; }
    if (!department || isNaN(target) || target < 0) { App.toast('请填写有效部门和目标'); return; }

    const meta = this._deptMeta[department] || {};
    if (!director) director = meta.director || '';
    if (!manager) manager = meta.manager || '';

    try {
      if (mode === 'edit' && id) {
        Store.updateEmployee(id, { name, department, target, initialCompleted, director, manager });
        App.toast(`已更新：${name}`);
      } else if (mode === 'insert' && afterId) {
        Store.insertEmployeeAfter(afterId, { name, department, target, initialCompleted, director, manager });
        App.toast(`已在指定位置插入：${name}`);
      } else {
        Store.addEmployee({ name, department, target, initialCompleted, director, manager });
        App.toast(`已新增：${name}`);
      }
      this.closeModal();
      App.onEmployeesChanged();
    } catch (err) {
      App.toast(err.message || '操作失败');
    }
  }
};
