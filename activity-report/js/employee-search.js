/**
 * 可搜索员工选择器 — 支持中文模糊 + 拼音全拼 + 首字母
 */
const EmployeeSearch = {
  _instances: {},

  matches(emp, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return true;
    const name = emp.name || '';
    const pinyin = (emp.pinyin || '').toLowerCase();
    const initials = (emp.initials || '').toLowerCase();
    if (/[\u4e00-\u9fff]/.test(q)) {
      if (name.includes(q)) return true;
      let qi = 0;
      for (let i = 0; i < name.length && qi < q.length; i++) {
        if (name[i] === q[qi]) qi++;
      }
      return qi === q.length;
    }
    if (initials.startsWith(q) || pinyin.startsWith(q)) return true;
    if (initials.includes(q) || pinyin.includes(q)) return true;
    return name.toLowerCase().includes(q);
  },

  mount(containerId, { onChange, placeholder = '输入姓名或拼音首字母搜索' } = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (container.dataset.mounted === '1') {
      return this._instances[containerId];
    }
    container.dataset.mounted = '1';

    container.className = 'search-select';
    container.innerHTML = `
      <input type="hidden" id="${containerId}Value" value="" />
      <div class="search-select-input-wrap">
        <input type="text" class="search-select-input" id="${containerId}Input"
          placeholder="${placeholder}" autocomplete="off" />
        <button type="button" class="search-select-clear" id="${containerId}Clear" title="清除">×</button>
      </div>
      <div class="search-select-dropdown" id="${containerId}Dropdown"></div>
    `;

    const hidden = document.getElementById(`${containerId}Value`);
    const input = document.getElementById(`${containerId}Input`);
    const dropdown = document.getElementById(`${containerId}Dropdown`);
    const clearBtn = document.getElementById(`${containerId}Clear`);

    let activeIndex = -1;
    let filtered = [];

    const inst = { hidden, input, dropdown, onChange, getValue: () => hidden.value, setValue: (id) => selectById(id, false) };
    this._instances[containerId] = inst;

    const getEmployees = () => Store.getEmployees();

    function selectById(id, focusNext = true) {
      const emp = getEmployees().find(e => e.id === id);
      if (!emp) {
        hidden.value = '';
        input.value = '';
        clearBtn.style.display = 'none';
        dropdown.classList.remove('show');
        onChange?.('');
        return;
      }
      hidden.value = emp.id;
      input.value = `${emp.name}（${emp.department} · 目标 ${Calc.formatMoney(emp.target)}）`;
      clearBtn.style.display = 'block';
      dropdown.classList.remove('show');
      onChange?.(emp.id, emp);
    }

    function matchEmployee(emp, query) {
      return EmployeeSearch.matches(emp, query);
    }

    function renderDropdown(list) {
      filtered = list;
      activeIndex = list.length ? 0 : -1;

      if (!list.length) {
        dropdown.innerHTML = '<div class="search-select-empty">无匹配员工</div>';
        dropdown.classList.add('show');
        return;
      }

      dropdown.innerHTML = list.map((emp, i) => {
        const tag = emp.department || '';
        const py = emp.initials ? `<span class="search-select-py">${emp.initials.toUpperCase()}</span>` : '';
        return `<div class="search-select-option${i === activeIndex ? ' active' : ''}"
          data-id="${emp.id}" data-index="${i}">
          <span class="search-select-name">${emp.name}</span>
          ${py}
          <span class="search-select-dept">${tag}</span>
          <span class="search-select-target">目标 ${Calc.formatMoney(emp.target)}</span>
        </div>`;
      }).join('');
      dropdown.classList.add('show');
    }

    function filterAndShow() {
      const raw = input.value;
      // 若已是选中态（含括号格式），提取搜索词需清空重搜
      const q = raw.includes('（') ? '' : raw;
      const list = getEmployees().filter(e => matchEmployee(e, q));
      renderDropdown(list);
    }

    function selectActive() {
      if (activeIndex >= 0 && filtered[activeIndex]) {
        selectById(filtered[activeIndex].id);
      }
    }

    input.addEventListener('focus', () => {
      if (hidden.value && input.value.includes('（')) {
        input.select();
      }
      filterAndShow();
    });

    input.addEventListener('input', () => {
      hidden.value = '';
      clearBtn.style.display = input.value ? 'block' : 'none';
      filterAndShow();
    });

    input.addEventListener('keydown', (ev) => {
      if (!dropdown.classList.contains('show')) {
        if (ev.key === 'ArrowDown' || ev.key === 'Enter') filterAndShow();
        return;
      }
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
        highlightOption();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        highlightOption();
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        selectActive();
      } else if (ev.key === 'Escape') {
        dropdown.classList.remove('show');
      }
    });

    function highlightOption() {
      dropdown.querySelectorAll('.search-select-option').forEach((el, i) => {
        el.classList.toggle('active', i === activeIndex);
      });
      const active = dropdown.querySelector('.search-select-option.active');
      active?.scrollIntoView({ block: 'nearest' });
    }

    dropdown.addEventListener('mousedown', (ev) => {
      const opt = ev.target.closest('.search-select-option');
      if (opt) {
        ev.preventDefault();
        selectById(opt.dataset.id);
      }
    });

    clearBtn.addEventListener('click', () => {
      hidden.value = '';
      input.value = '';
      clearBtn.style.display = 'none';
      dropdown.classList.remove('show');
      input.focus();
      onChange?.('');
    });

    document.addEventListener('click', (ev) => {
      if (!container.contains(ev.target)) {
        dropdown.classList.remove('show');
      }
    });

    clearBtn.style.display = 'none';
    return inst;
  },

  getValue(containerId) {
    return this._instances[containerId]?.getValue() || '';
  },

  clear(containerId) {
    this._instances[containerId]?.setValue('');
  },

  refresh(containerId) {
    const inst = this._instances[containerId];
    if (inst?.hidden.value) {
      inst.setValue(inst.hidden.value);
    }
  }
};
