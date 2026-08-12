/* congrats-generator app — behavior-preserving refactor */
// 设计稿基准尺寸与文字区域（随模板切换）
        let DESIGN_SIZE = { width: 1080, height: 1990 };
        let TEXT_AREAS = {
            dept: { x: 966, y: 500, width: 80, height: 300 },
            name: { x: 898, y: 505, width: 80, height: 200 },
            congrats: { x: 110, y: 1272, width: 880, height: 150 },
            order: { x: 100, y: 1400, width: 880, height: 100 },
            amount: { x: 100, y: 1550, width: 880, height: 150 }
        };
        const AVATAR_LAYOUT = { cx: 540, cy: 790, size: 391 };
        const DEPARTMENTS = ['销售部', '行政部', '医疗中心', '总经理', '副总经理'];
        const AVATAR_FILTER_DEPARTMENTS = ['销售部', '行政部', '医疗中心', '副总经理'];
        const ORDER_PRESETS = ['签约团检1单', '开门红套餐下单', '618活动套餐下单', '"双11"活动套餐下单'];
        const FONT_OPTIONS = [
            { value: 'ChuangkitZongYi', label: '创意字体' },
            { value: 'NotoSansSCBlack', label: '黑体' },
            { value: 'NotoSansSCMedium', label: '中等黑体' }
        ];
        const COLOR_SWATCHES = ['#fff2eb', '#9f0913', '#80090d', '#ffb875', '#ffffff', '#1e293b', '#f5d882', '#8b0a0f'];
        const STYLE_PRESETS = {
            sidebar: { label: '侧栏竖排', fontFamily: 'NotoSansSCBlack', fontSize: 48, fontColor: '#fff2eb' },
            name: { label: '姓名', fontFamily: 'NotoSansSCBlack', fontSize: 40, fontColor: '#fff2eb' },
            body: { label: '正文', fontFamily: 'NotoSansSCMedium', fontSize: 42, fontColor: '#9f0913' },
            order: { label: '下单', fontFamily: 'ChuangkitZongYi', fontSize: 48, fontColor: '#80090d' },
            amount: { label: '金额', fontFamily: 'NotoSansSCBlack', fontSize: 170, fontColor: '#ffb875' },
            dietHeader: { label: '膳食标题', fontFamily: 'NotoSansSCBlack', fontSize: 28, fontColor: '#f5d882' },
            dietItems: { label: '膳食明细', fontFamily: 'NotoSansSCMedium', fontSize: 24, fontColor: '#8b0a0f' },
            dietAmount: { label: '膳食合计', fontFamily: 'NotoSansSCBlack', fontSize: 56, fontColor: '#ffb875' }
        };
        const INDIVIDUAL_TEXT_FIELD_CONFIG = {
            dept: {
                label: '部门',
                vertical: true,
                stylePreset: 'sidebar',
                defaultContent: '销售部',
                presets: DEPARTMENTS,
                fontSizeMax: 200
            },
            name: {
                label: '姓名',
                vertical: true,
                stylePreset: 'name',
                defaultContent: '',
                fontSizeMax: 200,
                linkedCongrats: true
            },
            congrats: {
                label: '恭喜',
                stylePreset: 'body',
                defaultContent: '',
                fontSizeMax: 300
            },
            order: {
                label: '下单',
                stylePreset: 'order',
                defaultContent: '618活动套餐下单',
                presets: ORDER_PRESETS,
                fontSizeMax: 200
            },
            amount: {
                label: '金额',
                stylePreset: 'amount',
                defaultContent: '',
                fontSizeMax: 300
            }
        };
        const DIET_TEXT_FIELD_CONFIG = {
            header: {
                label: '祝贺标题',
                stylePreset: 'dietHeader',
                defaultContent: '热烈祝贺定西公司\n膳食中心今日售出',
                fontSizeMax: 80
            },
            items: {
                label: '售出明细',
                stylePreset: 'dietItems',
                defaultContent: '',
                fontSizeMax: 60
            },
            amount: {
                label: '合计金额',
                stylePreset: 'dietAmount',
                defaultContent: '',
                fontSizeMax: 120
            }
        };
        const TEMPLATES = {
            individual: {
                id: 'individual',
                label: '个检业绩喜报',
                designSize: { width: 1080, height: 1990 },
                bgUrl: 'https://raw.githubusercontent.com/Nmfengtongxue/daily_imgs/main/6.jpg',
                topOverlayUrl: 'https://raw.githubusercontent.com/Nmfengtongxue/daily_imgs/main/7.png',
                hasAvatar: true,
                textAreas: {
                    dept: { x: 966, y: 500, width: 80, height: 300 },
                    name: { x: 898, y: 505, width: 80, height: 200 },
                    congrats: { x: 110, y: 1272, width: 880, height: 150 },
                    order: { x: 100, y: 1400, width: 880, height: 100 },
                    amount: { x: 100, y: 1550, width: 880, height: 150 }
                },
                textFieldConfig: INDIVIDUAL_TEXT_FIELD_CONFIG,
                defaultActiveField: 'dept',
                exportDefaults: { width: 1080, height: 1990 }
            },
            diet: {
                id: 'diet',
                label: '膳食中心喜报',
                designSize: { width: 900, height: 500 },
                bgUrl: 'congrats-assets/diet-center-template.png',
                topOverlayUrl: null,
                hasAvatar: false,
                textAreas: {
                    header: { x: 430, y: 52, width: 450, height: 96 },
                    items: { x: 450, y: 188, width: 400, height: 72 },
                    amount: { x: 648, y: 352, width: 96, height: 72 }
                },
                textFieldConfig: DIET_TEXT_FIELD_CONFIG,
                defaultActiveField: 'items',
                exportDefaults: { width: 900, height: 500 }
            }
        };
        let TEXT_FIELD_CONFIG = INDIVIDUAL_TEXT_FIELD_CONFIG;
        let currentTemplateId = 'individual';
        let dietItems = [{ name: '锌硒胆碱片', quantity: 2, unitPrice: 73.5 }];
        let textFieldState = {};
        let activeFieldKey = 'dept';
        // 人员名单版本号（变更后递增，用于覆盖浏览器 localStorage 中的旧名单）
        const PERSONNEL_MAP_REVISION = '2026-08-05-v1';
        // 人员名单映射（姓名 -> 部门）
        const PERSONNEL_MAP = {
            // 销售部
            '陈炳森': '销售部',
            '白金玉': '销售部',
            '王莉莉': '销售部',
            '刘倩倩': '销售部',
            // 行政部
            '范宏云': '行政部',
            '杜永丽': '行政部',
            '朱甦雅': '行政部',
            '王斌斌': '行政部',
            '张巧花': '行政部',
            '俞帅文': '行政部',
            '李雁程': '行政部',
            '王晶玉': '行政部',
            '陈佩鹃': '行政部',
            // 医疗中心
            '童守义': '医疗中心',
            '张静': '医疗中心',
            '张改霞': '医疗中心',
            '赵改过': '医疗中心',
            '孙悦': '医疗中心',
            '苏丹': '医疗中心',
            '郭锦霞': '医疗中心',
            '王晓霞': '医疗中心',
            '汪佑安': '医疗中心',
            '杨晓晖': '医疗中心',
            '张英玲': '医疗中心',
            '刘力榕': '医疗中心',
            '耿新民': '医疗中心',
            '刘艳丽': '医疗中心',
            '胡立茹': '医疗中心',
            '胡秀娥': '医疗中心',
            '梁晓菊': '医疗中心',
            '王烁楠': '医疗中心',
            '赵润蕊': '医疗中心',
            '韩万忠': '医疗中心',
            '郑晓燕': '医疗中心',
            '潘丽萍': '医疗中心',
            '魏霞': '医疗中心',
            '董凯丽': '医疗中心',
            '姜媛媛': '医疗中心',
            '党江娟': '医疗中心',
            '刘沛': '医疗中心',
            '姚建强': '医疗中心',
            '苏巧燕': '医疗中心',
            '杨文娟': '医疗中心',
            '张丽娟': '医疗中心',
            '周娜': '医疗中心',
            '朱丹': '医疗中心',
            '邵倩': '医疗中心',
            '程芸': '医疗中心',
            '王倩倩': '医疗中心',
            '张鹤延': '医疗中心',
            '马艳萍': '医疗中心',
            '王敏敏': '医疗中心',
            '张彩荷': '医疗中心',
            '朱文婷': '医疗中心',
            '张园胜': '医疗中心',
            '曹圆圆': '医疗中心',
            '徐秀梅': '医疗中心',
            '白常蓉': '医疗中心'
        };
        // 头像文件名别名（名单姓名 -> 服务器旧文件名，待图片重命名后可删除对应项）
        const PHOTO_NAME_ALIASES = {};
        // 人员职务提示（鼠标悬停姓名时展示，不影响部门归属）
        const PERSONNEL_ROLE_HINT = {
            '徐秀梅': '放射科主任'
        };
        const updateLogs = [
            '2026-08-05: 医疗部李雨婷离职，从喜报名单移除（未打卡统计名单保留、灰色标注）',
            '2026-08-05: 医疗中心新增白常蓉；同步未打卡统计名单',
            '2026-07-20: 行政部新增陈佩鹃；同步未打卡统计名单',
            '2026-07-08: 新增膳食中心喜报模板，支持物品明细录入与合计金额自动计算',
            '2026-06-16: 医疗部孔娟娟离职，从喜报名单移除（未打卡统计名单保留、灰色标注）',
            '2026-06-16: 医疗中心新增徐秀梅（放射科主任，悬停姓名可查看职务）；同步徐秀梅.png 至 GitHub 头像库',
            '2026-08-12: 行为不变重构：统一模板启动、字体/历史就绪对齐、头像CORS统一、批量短路、拆分资源文件',
            '2026-08-12: 新增视图锁定（默认锁定不可拖拽）与批量文本生成（模板审阅后自动出图）',
            '2026-08-12: 说明改为旁侧 i 图标长悬停提示；选中自动开面板可开关；支持 Delete/⌘Z、Ctrl+滚轮缩放与拖拽平移',
            '2026-08-12: 导出设置改为与编辑面板同款悬浮；去掉与维护头像库重复的高级上传；点击面板外收起',
            '2026-08-12: 编辑面板改为预览区左侧悬浮（对齐选人/文字栏），选人仅预览不自动跳转文字',
            '2026-08-12: 操作栏改到预览区左侧悬浮；选人/文字/明细合并为同一编辑抽屉，确认头像后自动切到文字编辑',
            '2026-08-08: 预览改用 Fabric setZoom（画布显示尺寸=设计稿×scale），多时机双 rAF 合并刷新；预览区 overflow:auto + scrollbar-gutter 兜底；导出前临时复位 zoom',
            '2026-06-12: 修复预览缩放后底图不显示：逻辑画布固定 1080×1990，预览仅用 cssOnly 缩放并重排',
            '2026-06-07: 三期 UI 改造：三 Offcanvas 抽屉 + Inspector 共用样式检查器 + 点击画布文字编辑',
            '2026-06-07: 预览缩放改用 Fabric setZoom，多时机双 rAF 刷新，预览区 overflow 改为 auto',
            '2026-06-07: 文字、头像、顶层装饰均以底图为基准相对定位，底图位置变化时整体保持相对位置不变',
            '2026-06-07: 预览画布按视口等比缩放完整展示，修复 Fabric 容器类名冲突导致的超高显示问题',
            '2026-06-07: 优化页面排版：头像管理默认置顶展开，文字编辑/导出/上传模块改为折叠侧栏',
            '2026-06-07: 头像姓名查找支持模糊中文搜索与拼音首字母搜索（含搜索建议列表）',
            '2026-06-07: 新增李雁程.png 至 GitHub 头像库',
            '2026-06-07: 同步 2026-06-07 新增人员文件夹 22 张头像至 GitHub，文件名与喜报名单一一对应；移除史正蓓、张文慧、曹娟、王佳等不在名单内的旧图',
            '2026-06-07: GitHub 头像同步：潘雨萍→潘丽萍、董凯雨→董凯丽（文件重命名）；新增张静.png；移除头像别名配置',
            '2026-06-06: 曹娟与曹圆圆为不同人员，曹娟已离职不在名单内；曹圆圆不再关联曹娟头像。潘丽萍、董凯丽为统一标准姓名',
            '2026-06-06: 同步现行人员名单（共 57 人：销售部 4、行政部 8、医疗中心 45）；姓名以最新版为准：朱甦雅、童守义、李雨婷、郭锦霞、邵倩、曹圆圆等',
            '2026-06-06: 按最新名单整体替换人员名单；范宏云调至行政部；新增俞帅文、汪佑安、耿新民、赵润蕊等；移除史正蓓、王佳、董博、张文慧、朱英等',
            '2026-06-01: 杨晓昭更正为杨晓晖'
        ];
        // 存储当前预览的头像信息
        let currentPreviewAvatar = null;
        // 存储上传的头像数据（姓名 -> 头像DataURL）
        let uploadedAvatars = {};
        // 全局变量
        let canvas; // Fabric.js画布实例
        let backgroundImage = null; // 背景图片对象
        let topOverlayImage = null; // 顶层装饰图 7.png
        let textObjects = {}; // 文字对象集合
        let backgroundFrame = { left: 0, top: 0, width: 1080, height: 1990, scale: 1 };
        let canvasPreviewResizeObserver = null;
        let canvasPreviewScale = 1;
        let previewUpdateRaf = null;
        let viewUserZoom = 1;
        let viewPanX = 0;
        let viewPanY = 0;
        let spacePanKey = false;
        let isViewPanning = false;
        let panLastX = 0;
        let panLastY = 0;
        let autoShowEditorPanel = true;
        let viewLocked = true;
        let historyStack = [];
        let historyIndex = -1;
        let historyLock = false;
        const HISTORY_LIMIT = 40;
        const AUTO_SHOW_KEY = 'congratsAutoShowEditor';
        const VIEW_LOCK_KEY = 'congratsViewLocked';
        let batchParsedRecords = [];
        let batchGenerating = false;
        let templateLoadToken = 0;
        let previewAvatarToken = 0;

        function getCurrentTemplate() {
            return TEMPLATES[currentTemplateId] || TEMPLATES.individual;
        }

        function applyTemplateRuntimeConfig(templateId) {
            const template = TEMPLATES[templateId] || TEMPLATES.individual;
            currentTemplateId = template.id;
            DESIGN_SIZE = Object.assign({}, template.designSize);
            TEXT_AREAS = JSON.parse(JSON.stringify(template.textAreas));
            TEXT_FIELD_CONFIG = template.textFieldConfig;
            activeFieldKey = template.defaultActiveField;
        }

        function updateTemplateActionBar() {
            const template = getCurrentTemplate();
            const editTextBtn = document.getElementById('editTextBtn');
            const editDietBtn = document.getElementById('editDietBtn');
            const avatarBtn = document.getElementById('avatarBtn');
            const batchBtn = document.getElementById('batchBtn');
            const dietTabBtn = document.getElementById('editorTabBtnDiet');
            const avatarTabBtn = document.getElementById('editorTabBtnAvatar');
            if (editTextBtn) editTextBtn.hidden = false;
            if (editDietBtn) editDietBtn.hidden = template.id !== 'diet';
            if (avatarBtn) avatarBtn.hidden = !template.hasAvatar;
            if (batchBtn) batchBtn.hidden = template.id !== 'individual';
            if (dietTabBtn) dietTabBtn.hidden = template.id !== 'diet';
            if (avatarTabBtn) avatarTabBtn.hidden = !template.hasAvatar;
            document.querySelectorAll('.template-type-btn').forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.template === currentTemplateId);
            });
            const exportWidth = document.getElementById('exportWidth');
            const exportHeight = document.getElementById('exportHeight');
            if (exportWidth) exportWidth.value = template.exportDefaults.width;
            if (exportHeight) exportHeight.value = template.exportDefaults.height;
            const tip = document.getElementById('editorFlowTip');
            if (tip) {
                tip.dataset.tip = template.id === 'diet'
                    ? '可在「明细」录入物品，或到「文字」微调样式'
                    : '预览头像后可先查看效果；需要时再点「确认并继续改文字」';
            }
            // 切换模板时若当前 tab 不可用，回落到合适分区
            const activeTab = document.querySelector('.editor-tab-btn.is-active')?.dataset.editorTab;
            if (template.id === 'diet' && (activeTab === 'avatar' || !activeTab)) {
                switchEditorTab('diet');
            } else if (template.id !== 'diet' && activeTab === 'diet') {
                switchEditorTab(template.hasAvatar ? 'avatar' : 'text');
            }
        }

        function formatDietAmount(total) {
            if (!Number.isFinite(total)) return '';
            const rounded = Math.round(total * 100) / 100;
            return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
        }

        function getDietLineSubtotal(item) {
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice);
            if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity <= 0) {
                return 0;
            }
            return quantity * unitPrice;
        }

        function getDietItemsTotal() {
            return dietItems.reduce((sum, item) => sum + getDietLineSubtotal(item), 0);
        }

        function buildDietHeaderText(companyName) {
            const company = (companyName || '定西公司').trim() || '定西公司';
            return `热烈祝贺${company}\n膳食中心今日售出`;
        }

        function buildDietItemsText() {
            return dietItems
                .filter(item => (item.name || '').trim())
                .map(item => {
                    const name = item.name.trim();
                    const quantity = Number(item.quantity);
                    if (Number.isFinite(quantity) && quantity > 0) {
                        return `${name}*${quantity}`;
                    }
                    return name;
                })
                .join('\n');
        }

        function syncDietCanvasFromForm() {
            if (currentTemplateId !== 'diet') return;
            const companyInput = document.getElementById('dietCompanyName');
            const companyName = companyInput ? companyInput.value : '定西公司';
            setFieldContent('header', buildDietHeaderText(companyName));
            setFieldContent('items', buildDietItemsText());
            setFieldContent('amount', formatDietAmount(getDietItemsTotal()));
            const totalDisplay = document.getElementById('dietTotalDisplay');
            if (totalDisplay) totalDisplay.textContent = formatDietAmount(getDietItemsTotal()) || '0';
        }

        function refreshInspectorFieldSelect() {
            const fieldSelect = document.getElementById('activeFieldSelect');
            if (!fieldSelect) return;
            fieldSelect.innerHTML = Object.keys(TEXT_FIELD_CONFIG).map(key => {
                const cfg = TEXT_FIELD_CONFIG[key];
                return `<option value="${key}">${cfg.label}</option>`;
            }).join('');
            fieldSelect.value = activeFieldKey;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function renderDietItemsTable() {
            const tbody = document.getElementById('dietItemsBody');
            if (!tbody) return;
            tbody.innerHTML = dietItems.map((item, index) => {
                const subtotal = getDietLineSubtotal(item);
                return `<tr data-index="${index}"><td><input type="text" class="diet-item-name" value="${escapeHtml(item.name || '')}" placeholder="物品名称"></td><td><input type="number" class="diet-item-qty" min="1" step="1" value="${escapeHtml(item.quantity ?? '')}" placeholder="数量"></td><td><input type="number" class="diet-item-price" min="0" step="0.01" value="${escapeHtml(item.unitPrice ?? '')}" placeholder="单价"></td><td class="subtotal-cell">${formatDietAmount(subtotal) || '0'}</td><td><button type="button" class="diet-row-remove" data-remove-index="${index}" ${dietItems.length <= 1 ? 'disabled' : ''}>删除</button></td></tr>`;
            }).join('');
        }

        function readDietItemsFromTable() {
            const tbody = document.getElementById('dietItemsBody');
            if (!tbody) return;
            dietItems = Array.from(tbody.querySelectorAll('tr')).map(row => ({
                name: row.querySelector('.diet-item-name')?.value.trim() || '',
                quantity: row.querySelector('.diet-item-qty')?.value,
                unitPrice: row.querySelector('.diet-item-price')?.value
            }));
            if (!dietItems.length) {
                dietItems = [{ name: '', quantity: 1, unitPrice: '' }];
            }
        }

        function initDietItemsPanel() {
            renderDietItemsTable();
            syncDietCanvasFromForm();

            const companyInput = document.getElementById('dietCompanyName');
            if (companyInput) {
                companyInput.addEventListener('input', function() {
                    syncDietCanvasFromForm();
                });
            }

            const tbody = document.getElementById('dietItemsBody');
            if (tbody) {
                tbody.addEventListener('input', function(event) {
                    if (!event.target.matches('input')) return;
                    readDietItemsFromTable();
                    renderDietItemsTable();
                    syncDietCanvasFromForm();
                });
                tbody.addEventListener('click', function(event) {
                    const removeBtn = event.target.closest('.diet-row-remove');
                    if (!removeBtn || removeBtn.disabled) return;
                    readDietItemsFromTable();
                    const index = Number(removeBtn.dataset.removeIndex);
                    dietItems.splice(index, 1);
                    if (!dietItems.length) {
                        dietItems.push({ name: '', quantity: 1, unitPrice: '' });
                    }
                    renderDietItemsTable();
                    syncDietCanvasFromForm();
                });
            }

            const addBtn = document.getElementById('addDietItemBtn');
            if (addBtn) {
                addBtn.addEventListener('click', function() {
                    readDietItemsFromTable();
                    dietItems.push({ name: '', quantity: 1, unitPrice: '' });
                    renderDietItemsTable();
                    syncDietCanvasFromForm();
                });
            }
        }

        function initTemplateSelector() {
            document.querySelectorAll('.template-type-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const nextTemplate = this.dataset.template;
                    if (!nextTemplate || nextTemplate === currentTemplateId) return;
                    switchTemplate(nextTemplate);
                });
            });
        }

        function loadTemplateImages(template, callback) {
            const token = ++templateLoadToken;
            fabric.Image.fromURL(template.bgUrl, function(bgImg) {
                if (token !== templateLoadToken) return;
                backgroundImage = bgImg;
                canvas.clear();
                fitTemplateImageToFrame(bgImg);
                canvas.add(bgImg);
                if (!template.topOverlayUrl) {
                    topOverlayImage = null;
                    callback(token);
                    return;
                }
                fabric.Image.fromURL(template.topOverlayUrl, function(topImg) {
                    if (token !== templateLoadToken) return;
                    topOverlayImage = topImg;
                    fitTemplateImageToFrame(topImg);
                    canvas.add(topImg);
                    callback(token);
                }, {
                    crossOrigin: 'anonymous',
                    onError: function(err) {
                        if (token !== templateLoadToken) return;
                        console.error('加载顶层图片失败:', err);
                        topOverlayImage = null;
                        callback(token);
                    }
                });
            }, {
                crossOrigin: 'anonymous',
                onError: function(err) {
                    if (token !== templateLoadToken) return;
                    console.error('加载背景图片失败:', err);
                    alert('模板底图加载失败，请检查网络或本地资源路径。');
                    callback(token, err || new Error('background load failed'));
                }
            });
            return token;
        }

        function applyTemplateDefaultContent(template, options) {
            options = options || {};
            if (template.id === 'individual') {
                setFieldContent('dept', '销售部');
                setFieldContent('order', '618活动套餐下单');
                return;
            }
            if (options.resetDiet) {
                dietItems = [{ name: '锌硒胆碱片', quantity: 2, unitPrice: 73.5 }];
                const companyInput = document.getElementById('dietCompanyName');
                if (companyInput) companyInput.value = '定西公司';
                renderDietItemsTable();
            }
            syncDietCanvasFromForm();
        }

        function bootstrapTemplateCanvas(options) {
            options = options || {};
            const template = options.template || getCurrentTemplate();
            historyLock = true;
            return new Promise(function(resolve) {
                loadTemplateImages(template, function(token, err) {
                    if (token !== templateLoadToken) {
                        resolve(null);
                        return;
                    }
                    if (err) {
                        historyLock = false;
                        resolve(null);
                        return;
                    }
                    try {
                        addTextObjects();
                        relayoutCanvasElements({ schedulePreview: false });
                        applyTemplateDefaultContent(template, { resetDiet: !!options.resetDiet });
                    } finally {
                        if (token === templateLoadToken) {
                            historyLock = false;
                            if (options.resetHistory) {
                                historyStack = [];
                                historyIndex = -1;
                                pushHistory();
                            }
                            schedulePreviewUpdate();
                        }
                    }
                    resolve(token === templateLoadToken ? template : null);
                });
            });
        }

        function whenDocumentFontsReady() {
            if (document.fonts && document.fonts.ready) {
                return document.fonts.ready.then(function() {}, function() {});
            }
            return Promise.resolve();
        }

        function switchTemplate(templateId) {
            if (!TEMPLATES[templateId] || templateId === currentTemplateId) return;
            applyTemplateRuntimeConfig(templateId);
            updateTemplateActionBar();
            initTextFieldState();
            refreshInspectorFieldSelect();
            syncInspectorUIFromState(activeFieldKey);

            if (canvas) {
                canvas.setWidth(DESIGN_SIZE.width);
                canvas.setHeight(DESIGN_SIZE.height);
            }
            resetCanvasViewTransform();
            bootstrapTemplateCanvas({ resetHistory: true });
        }

        function refreshBackgroundFrame() {
            backgroundFrame = {
                left: 0,
                top: 0,
                width: DESIGN_SIZE.width,
                height: DESIGN_SIZE.height,
                scale: 1
            };
            return backgroundFrame;
        }

        function designToCanvas(x, y) {
            return {
                x: backgroundFrame.left + x * backgroundFrame.scale,
                y: backgroundFrame.top + y * backgroundFrame.scale
            };
        }

        function designToCanvasSize(value) {
            return value * backgroundFrame.scale;
        }

        function fitTemplateImageToFrame(img) {
            refreshBackgroundFrame();
            img.set({
                left: backgroundFrame.left,
                top: backgroundFrame.top,
                scaleX: backgroundFrame.width / img.width,
                scaleY: backgroundFrame.height / img.height,
                originX: 'left',
                originY: 'top',
                selectable: false,
                evented: false
            });
            img.setCoords();
            return img;
        }

        function buildAvatarClip(radius) {
            return function(ctx) {
                ctx.save();
                ctx.globalCompositeOperation = 'destination-in';
                ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.restore();
            };
        }

        function configureAvatarImage(img) {
            refreshBackgroundFrame();
            const maxSize = designToCanvasSize(AVATAR_LAYOUT.size);
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const radius = maxSize / 2;
            const center = designToCanvas(AVATAR_LAYOUT.cx, AVATAR_LAYOUT.cy);
            img.set({
                scaleX: scale,
                scaleY: scale,
                left: center.x,
                top: center.y,
                originX: 'center',
                originY: 'center',
                clipTo: buildAvatarClip(radius),
                selectable: true,
                evented: true,
                isAvatar: true
            });
            img.setCoords();
            return img;
        }

        function getTextObjectPosition(key) {
            const area = TEXT_AREAS[key];
            if (!area) return {};

            if (TEXT_FIELD_CONFIG[key]?.vertical) {
                const point = designToCanvas(area.x + area.width / 2, area.y);
                return { left: point.x, top: point.y, originX: 'center', originY: 'top' };
            }
            if (key === 'congrats' || key === 'header') {
                const point = designToCanvas(area.x, area.y);
                return { left: point.x, top: point.y, originX: 'left', originY: 'top' };
            }
            if (key === 'items') {
                const point = designToCanvas(area.x + area.width / 2, area.y + area.height / 2);
                return { left: point.x, top: point.y, originX: 'center', originY: 'center' };
            }
            if (key === 'order') {
                const point = designToCanvas(area.x + area.width / 2, area.y);
                return { left: point.x, top: point.y, originX: 'center', originY: 'middle' };
            }
            if (key === 'amount') {
                const point = designToCanvas(area.x + area.width / 2, area.y + area.height / 2);
                return { left: point.x, top: point.y, originX: 'center', originY: 'middle' };
            }
            return {};
        }

        function applyLayoutToTextObjects() {
            Object.keys(textObjects).forEach(key => {
                if (!textObjects[key]) return;
                textObjects[key].set(getTextObjectPosition(key));
                textObjects[key].setCoords();
            });
        }

        function applyLayoutToAvatarImages() {
            if (!canvas) return;
            const maxSize = designToCanvasSize(AVATAR_LAYOUT.size);
            const radius = maxSize / 2;
            const center = designToCanvas(AVATAR_LAYOUT.cx, AVATAR_LAYOUT.cy);
            canvas.getObjects().forEach(obj => {
                if (!obj.clipTo) return;
                const scale = Math.min(maxSize / obj.width, maxSize / obj.height);
                obj.set({
                    scaleX: scale,
                    scaleY: scale,
                    left: center.x,
                    top: center.y,
                    originX: 'center',
                    originY: 'center',
                    clipTo: buildAvatarClip(radius)
                });
                obj.setCoords();
            });
        }

        function syncCanvasLayerOrder() {
            if (!canvas) return;
            let index = 0;
            if (backgroundImage) {
                backgroundImage.moveTo(index);
                index += 1;
            }
            canvas.getObjects().filter(obj => obj.clipTo).forEach(obj => {
                obj.moveTo(index);
                index += 1;
            });
            if (topOverlayImage) {
                topOverlayImage.moveTo(index);
                index += 1;
            }
            Object.values(textObjects).forEach(obj => {
                if (!obj) return;
                obj.moveTo(index);
                index += 1;
            });
        }

        function relayoutCanvasElements(options) {
            if (!canvas) return;
            refreshBackgroundFrame();
            if (backgroundImage) fitTemplateImageToFrame(backgroundImage);
            if (topOverlayImage) fitTemplateImageToFrame(topOverlayImage);
            applyLayoutToAvatarImages();
            applyLayoutToTextObjects();
            syncCanvasLayerOrder();
            canvas.requestRenderAll();
            if (!options || options.schedulePreview !== false) {
                schedulePreviewUpdate();
            }
        }

        function getCanvasDesignSize() {
            return {
                designWidth: DESIGN_SIZE.width,
                designHeight: DESIGN_SIZE.height
            };
        }

        function schedulePreviewUpdate() {
            if (batchGenerating) return;
            if (previewUpdateRaf !== null) return;
            previewUpdateRaf = requestAnimationFrame(function() {
                previewUpdateRaf = null;
                if (batchGenerating) return;
                requestAnimationFrame(updateCanvasPreviewScale);
            });
        }

        function updatePreviewScaleLabel(designWidth, designHeight, scale) {
            const label = document.getElementById('previewScaleLabel');
            if (!label) return;
            const fitPercent = Math.max(1, Math.round(scale * 100));
            const viewPercent = Math.max(1, Math.round(viewUserZoom * 100));
            label.textContent = viewPercent === 100
                ? `${designWidth} × ${designHeight} · ${fitPercent}%`
                : `${designWidth} × ${designHeight} · ${fitPercent}% · 视图 ${viewPercent}%`;
        }

        function applyCanvasViewTransform() {
            if (!canvas) return;
            const z = (canvasPreviewScale || 1) * viewUserZoom;
            canvas.setViewportTransform([z, 0, 0, z, viewPanX, viewPanY]);
            canvas.requestRenderAll();
            canvas.calcOffset();
            updatePreviewScaleLabel(DESIGN_SIZE.width, DESIGN_SIZE.height, canvasPreviewScale);
        }

        function resetCanvasViewTransform() {
            viewUserZoom = 1;
            viewPanX = 0;
            viewPanY = 0;
            if (canvas) applyCanvasViewTransform();
        }

        /**
         * 预览缩放：画布元素按视口适配；用户缩放/平移走 viewportTransform（创客贴式）。
         */
        function updateCanvasPreviewScale() {
            if (!canvas) return;

            const panel = document.getElementById('canvasPreviewPanel');
            if (!panel) return;

            const { designWidth, designHeight } = getCanvasDesignSize();
            if (!designWidth || !designHeight) return;

            const styles = window.getComputedStyle(panel);
            const paddingX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
            const paddingY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
            const availableWidth = Math.max(panel.clientWidth - paddingX - 4, 160);
            const availableHeight = Math.max(panel.clientHeight - paddingY - 4, 240);
            let fitScale = Math.min(availableWidth / designWidth, availableHeight / designHeight);
            if (!Number.isFinite(fitScale) || fitScale <= 0) fitScale = 0.1;

            const displayWidth = Math.max(1, Math.round(designWidth * fitScale));
            const displayHeight = Math.max(1, Math.round(designHeight * fitScale));
            fitScale = Math.min(displayWidth / designWidth, displayHeight / designHeight);
            canvasPreviewScale = fitScale;

            const sizeUnchanged = canvas.getWidth() === displayWidth && canvas.getHeight() === displayHeight;
            if (!sizeUnchanged) {
                canvas.setDimensions({ width: displayWidth, height: displayHeight });
            }
            applyCanvasViewTransform();
        }

        /**
         * 导出/测量时临时回到设计稿 1:1 分辨率，执行完后恢复预览缩放。
         * 导出期间锁定预览区尺寸并隐藏画布，避免大尺寸画布撑开布局导致 scale 算错。
         */
        function withDesignCanvas(fn) {
            if (!canvas) return fn();

            const panel = document.getElementById('canvasPreviewPanel');
            const wrapper = canvas.wrapperEl;
            const prev = {
                panelHeight: panel ? panel.style.height : '',
                panelMinHeight: panel ? panel.style.minHeight : '',
                panelOverflow: panel ? panel.style.overflow : '',
                wrapperVisibility: wrapper ? wrapper.style.visibility : ''
            };

            if (panel) {
                const rect = panel.getBoundingClientRect();
                panel.style.height = `${Math.round(rect.height)}px`;
                panel.style.minHeight = `${Math.round(rect.height)}px`;
                panel.style.overflow = 'hidden';
            }
            if (wrapper) {
                wrapper.style.visibility = 'hidden';
            }

            canvas.setZoom(1);
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            canvas.setDimensions({
                width: DESIGN_SIZE.width,
                height: DESIGN_SIZE.height
            });
            canvas.calcOffset();
            try {
                return fn();
            } finally {
                if (panel) {
                    panel.style.height = prev.panelHeight;
                    panel.style.minHeight = prev.panelMinHeight;
                    panel.style.overflow = prev.panelOverflow;
                }
                if (wrapper) {
                    wrapper.style.visibility = prev.wrapperVisibility;
                }
                schedulePreviewUpdate();
            }
        }

        function initCanvasPreviewResize() {
            const panel = document.getElementById('canvasPreviewPanel');
            const previewCard = document.querySelector('.preview-card');
            const workspaceMain = document.querySelector('.workspace-main');
            if (!panel) return;

            if (canvasPreviewResizeObserver) {
                canvasPreviewResizeObserver.disconnect();
            }

            if (typeof ResizeObserver !== 'undefined') {
                canvasPreviewResizeObserver = new ResizeObserver(function() {
                    schedulePreviewUpdate();
                });
                canvasPreviewResizeObserver.observe(panel);
                if (previewCard) {
                    canvasPreviewResizeObserver.observe(previewCard);
                }
                if (workspaceMain) {
                    canvasPreviewResizeObserver.observe(workspaceMain);
                }
            }

            window.addEventListener('resize', schedulePreviewUpdate);
            window.addEventListener('orientationchange', schedulePreviewUpdate);
            document.addEventListener('visibilitychange', function() {
                if (!document.hidden) schedulePreviewUpdate();
            });
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(schedulePreviewUpdate);
            }
        }

        function initTextFieldState() {
            textFieldState = {};
            Object.keys(TEXT_FIELD_CONFIG).forEach(key => {
                const cfg = TEXT_FIELD_CONFIG[key];
                const preset = STYLE_PRESETS[cfg.stylePreset];
                textFieldState[key] = {
                    content: cfg.defaultContent || '',
                    fontFamily: preset.fontFamily,
                    fontSize: preset.fontSize,
                    fontColor: preset.fontColor
                };
            });
        }

        function getFieldContent(key) {
            return textFieldState[key]?.content ?? '';
        }

        function setFieldContent(key, value, options = {}) {
            if (!textFieldState[key]) return;
            textFieldState[key].content = value;
            if (key === activeFieldKey) {
                const input = document.getElementById('inspectorContent');
                if (input && input.value !== value) input.value = value;
            }
            updateTextObject(key);
            if (TEXT_FIELD_CONFIG[key]?.linkedCongrats) {
                updateCongratsText();
            }
            if (options.openEditor) {
                selectTextField(key, { openEditor: true });
            }
        }

        function commitInspectorToState() {
            if (!textFieldState[activeFieldKey]) return;
            const state = textFieldState[activeFieldKey];
            const contentEl = document.getElementById('inspectorContent');
            const fontEl = document.getElementById('inspectorFontFamily');
            const sizeEl = document.getElementById('inspectorFontSize');
            const colorEl = document.getElementById('inspectorFontColor');
            if (contentEl) state.content = contentEl.value;
            if (fontEl) state.fontFamily = fontEl.value;
            if (sizeEl) state.fontSize = parseInt(sizeEl.value, 10) || state.fontSize;
            if (colorEl) state.fontColor = colorEl.value;
        }

        function syncInspectorUIFromState(key) {
            activeFieldKey = key;
            const cfg = TEXT_FIELD_CONFIG[key];
            const state = textFieldState[key];
            if (!cfg || !state) return;

            const fieldSelect = document.getElementById('activeFieldSelect');
            if (fieldSelect) fieldSelect.value = key;

            const contentEl = document.getElementById('inspectorContent');
            if (contentEl) {
                contentEl.value = state.content;
                contentEl.placeholder = `请输入${cfg.label}`;
            }

            const presetGroup = document.getElementById('fieldPresetGroup');
            const presetSelect = document.getElementById('fieldPresetSelect');
            if (presetGroup && presetSelect) {
                if (cfg.presets && cfg.presets.length) {
                    presetGroup.hidden = false;
                    presetSelect.innerHTML = '<option value="">请选择</option>' +
                        cfg.presets.map(p => `<option value="${p}">${p}</option>`).join('');
                } else {
                    presetGroup.hidden = true;
                }
            }

            const fontEl = document.getElementById('inspectorFontFamily');
            const sizeEl = document.getElementById('inspectorFontSize');
            const colorEl = document.getElementById('inspectorFontColor');
            if (fontEl) fontEl.value = state.fontFamily;
            if (sizeEl) {
                sizeEl.value = state.fontSize;
                sizeEl.max = cfg.fontSizeMax || 300;
            }
            if (colorEl) colorEl.value = state.fontColor;

            document.querySelectorAll('.style-preset-chip').forEach(chip => {
                chip.classList.toggle('is-active', chip.dataset.preset === cfg.stylePreset);
            });
            document.querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.classList.toggle('is-active', swatch.dataset.color === state.fontColor);
            });
        }

        function selectTextField(key, options = {}) {
            if (!TEXT_FIELD_CONFIG[key]) return;
            if (key !== activeFieldKey) {
                commitInspectorToState();
                updateTextObject(activeFieldKey);
            }
            syncInspectorUIFromState(key);
            if (options.openEditor) {
                openEditorPanel('text');
            }
        }

        function openOffcanvas(id) {
            // 兼容旧调用：导出已改为悬浮面板
            if (id === 'exportOffcanvas') {
                openExportPanel();
                return;
            }
            if (id === 'editOffcanvas') {
                openEditorPanel();
                return;
            }
            const el = document.getElementById(id);
            if (!el || !window.bootstrap) return;
            bootstrap.Offcanvas.getOrCreateInstance(el).show();
        }

        function isFloatPanelOpen(id) {
            const panel = document.getElementById(id);
            return !!(panel && panel.classList.contains('is-open'));
        }

        function isEditorPanelOpen() {
            return isFloatPanelOpen('editOffcanvas');
        }

        function isExportPanelOpen() {
            return isFloatPanelOpen('exportOffcanvas');
        }

        function setFloatPanelOpen(id, open) {
            const panel = document.getElementById(id);
            if (!panel) return;
            panel.classList.toggle('is-open', open);
            panel.hidden = !open;
        }

        function syncPreviewBodyOpenState() {
            const body = document.querySelector('.preview-card-body');
            if (!body) return;
            body.classList.toggle(
                'is-editor-open',
                isEditorPanelOpen() || isExportPanelOpen() || isFloatPanelOpen('batchOffcanvas')
            );
        }

        function closeEditorPanel() {
            setFloatPanelOpen('editOffcanvas', false);
            document.querySelectorAll('.workspace-action-btn[data-editor-tab]').forEach(btn => {
                btn.classList.remove('is-active');
            });
            syncPreviewBodyOpenState();
            schedulePreviewUpdate();
        }

        function closeExportPanel() {
            setFloatPanelOpen('exportOffcanvas', false);
            const exportBtn = document.getElementById('exportRailBtn');
            if (exportBtn) exportBtn.classList.remove('is-active');
            syncPreviewBodyOpenState();
            schedulePreviewUpdate();
        }

        function closeBatchPanel() {
            setFloatPanelOpen('batchOffcanvas', false);
            const batchBtn = document.getElementById('batchBtn');
            if (batchBtn) batchBtn.classList.remove('is-active');
            syncPreviewBodyOpenState();
            schedulePreviewUpdate();
        }

        function closeAllFloatPanels() {
            closeEditorPanel();
            closeExportPanel();
            closeBatchPanel();
        }

        function switchEditorTab(tab) {
            const allowed = ['avatar', 'text', 'diet'];
            if (!allowed.includes(tab)) tab = 'text';
            const template = getCurrentTemplate();
            if (tab === 'avatar' && !template.hasAvatar) tab = 'text';
            if (tab === 'diet' && template.id !== 'diet') tab = 'text';

            document.querySelectorAll('.editor-tab-btn').forEach(btn => {
                const on = btn.dataset.editorTab === tab;
                btn.classList.toggle('is-active', on);
                btn.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            document.querySelectorAll('[data-editor-tab-panel]').forEach(panel => {
                panel.hidden = panel.dataset.editorTabPanel !== tab;
            });
            document.querySelectorAll('.workspace-action-btn[data-editor-tab]').forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.editorTab === tab && isEditorPanelOpen());
            });
            return tab;
        }

        function openEditorPanel(tab) {
            const panel = document.getElementById('editOffcanvas');
            if (!panel) return;

            closeExportPanel();
            closeBatchPanel();
            const nextTab = switchEditorTab(tab || 'avatar');
            setFloatPanelOpen('editOffcanvas', true);
            document.querySelectorAll('.workspace-action-btn[data-editor-tab]').forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.editorTab === nextTab);
            });
            syncPreviewBodyOpenState();

            const tip = document.getElementById('editorFlowTip');
            if (tip) {
                if (nextTab === 'avatar') tip.dataset.tip = '预览头像后可先查看效果；需要时再点「确认并继续改文字」';
                else if (nextTab === 'text') tip.dataset.tip = '可改金额、下单信息与字体样式；点画布文字也可定位字段';
                else if (nextTab === 'diet') tip.dataset.tip = '录入物品明细，合计金额会自动写入画布';
            }
            schedulePreviewUpdate();
        }

        function openExportPanel() {
            closeEditorPanel();
            closeBatchPanel();
            setFloatPanelOpen('exportOffcanvas', true);
            const exportBtn = document.getElementById('exportRailBtn');
            if (exportBtn) exportBtn.classList.add('is-active');
            syncPreviewBodyOpenState();
            schedulePreviewUpdate();
        }

        function openBatchPanel() {
            closeEditorPanel();
            closeExportPanel();
            ensureBatchTemplateFilled();
            setFloatPanelOpen('batchOffcanvas', true);
            const batchBtn = document.getElementById('batchBtn');
            if (batchBtn) batchBtn.classList.add('is-active');
            syncPreviewBodyOpenState();
            schedulePreviewUpdate();
        }

        function toggleBatchPanel() {
            if (isFloatPanelOpen('batchOffcanvas')) {
                closeBatchPanel();
                return;
            }
            openBatchPanel();
        }

        function toggleEditorPanel(tab) {
            const activeTab = document.querySelector('.editor-tab-btn.is-active')?.dataset.editorTab;
            if (isEditorPanelOpen() && activeTab === tab) {
                closeEditorPanel();
                return;
            }
            openEditorPanel(tab);
        }

        function toggleExportPanel() {
            if (isExportPanelOpen()) {
                closeExportPanel();
                return;
            }
            openExportPanel();
        }

        function populateSelectOptions(selectEl, items, includeEmpty, emptyLabel) {
            if (!selectEl) return;
            selectEl.innerHTML = includeEmpty ? `<option value="">${emptyLabel || '请选择'}</option>` : '';
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                selectEl.appendChild(option);
            });
        }

        function initInspectorUI() {
            const fieldSelect = document.getElementById('activeFieldSelect');
            if (fieldSelect) {
                fieldSelect.innerHTML = Object.keys(TEXT_FIELD_CONFIG).map(key => {
                    const cfg = TEXT_FIELD_CONFIG[key];
                    return `<option value="${key}">${cfg.label}</option>`;
                }).join('');
                fieldSelect.addEventListener('change', function() {
                    selectTextField(this.value);
                });
            }

            const fontSelect = document.getElementById('inspectorFontFamily');
            if (fontSelect) {
                fontSelect.innerHTML = FONT_OPTIONS.map(opt =>
                    `<option value="${opt.value}">${opt.label}</option>`
                ).join('');
            }

            const presetBar = document.getElementById('stylePresetBar');
            if (presetBar) {
                presetBar.innerHTML = Object.entries(STYLE_PRESETS).map(([key, preset]) =>
                    `<button type="button" class="style-preset-chip" data-preset="${key}">${preset.label}</button>`
                ).join('');
                presetBar.addEventListener('click', function(e) {
                    const chip = e.target.closest('.style-preset-chip');
                    if (!chip) return;
                    applyStylePreset(chip.dataset.preset, { targetKey: activeFieldKey });
                });
            }

            const swatchBar = document.getElementById('colorSwatchBar');
            if (swatchBar) {
                swatchBar.innerHTML = COLOR_SWATCHES.map(color =>
                    `<button type="button" class="color-swatch" data-color="${color}" style="background:${color}" title="${color}"></button>`
                ).join('');
                swatchBar.addEventListener('click', function(e) {
                    const swatch = e.target.closest('.color-swatch');
                    if (!swatch) return;
                    document.getElementById('inspectorFontColor').value = swatch.dataset.color;
                    commitInspectorToState();
                    updateTextObject(activeFieldKey);
                    syncInspectorUIFromState(activeFieldKey);
                });
            }

            populateSelectOptions(document.getElementById('deptFilter'), AVATAR_FILTER_DEPARTMENTS, true, '全部部门');
            populateSelectOptions(document.getElementById('avatarReverseDept'), AVATAR_FILTER_DEPARTMENTS, false);

            const contentEl = document.getElementById('inspectorContent');
            if (contentEl) {
                contentEl.addEventListener('input', function() {
                    textFieldState[activeFieldKey].content = this.value;
                    updateTextObject(activeFieldKey);
                    if (TEXT_FIELD_CONFIG[activeFieldKey]?.linkedCongrats) {
                        updateCongratsText();
                    }
                });
            }

            const presetSelect = document.getElementById('fieldPresetSelect');
            if (presetSelect) {
                presetSelect.addEventListener('change', function() {
                    if (!this.value) return;
                    setFieldContent(activeFieldKey, this.value);
                    this.value = '';
                });
            }

            ['inspectorFontFamily', 'inspectorFontSize', 'inspectorFontColor'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                const eventName = id === 'inspectorFontFamily' ? 'change' : 'input';
                el.addEventListener(eventName, function() {
                    commitInspectorToState();
                    updateTextObject(activeFieldKey);
                });
            });

            const applyAllBtn = document.getElementById('applyStyleToAllBtn');
            if (applyAllBtn) {
                applyAllBtn.addEventListener('click', applyCurrentStyleToAllFields);
            }

            syncInspectorUIFromState(activeFieldKey);
        }

        function applyStylePreset(presetKey, options = {}) {
            const preset = STYLE_PRESETS[presetKey];
            if (!preset) return;
            const targetKey = options.targetKey || activeFieldKey;
            Object.assign(textFieldState[targetKey], {
                fontFamily: preset.fontFamily,
                fontSize: preset.fontSize,
                fontColor: preset.fontColor
            });
            if (targetKey === activeFieldKey) {
                syncInspectorUIFromState(activeFieldKey);
            }
            updateTextObject(targetKey);
        }

        function applyCurrentStyleToAllFields() {
            commitInspectorToState();
            const { fontFamily, fontSize, fontColor } = textFieldState[activeFieldKey];
            Object.keys(textFieldState).forEach(key => {
                Object.assign(textFieldState[key], { fontFamily, fontSize, fontColor });
                updateTextObject(key);
            });
            syncInspectorUIFromState(activeFieldKey);
        }

        function getTextFieldKeyFromObject(obj) {
            if (!obj) return null;
            if (obj.fieldKey) return obj.fieldKey;
            return Object.keys(textObjects).find(key => textObjects[key] === obj) || null;
        }

        function initOffcanvasPanels() {
            const editorCloseBtn = document.getElementById('editorFloatCloseBtn');
            if (editorCloseBtn) {
                editorCloseBtn.addEventListener('click', closeEditorPanel);
            }
            const exportCloseBtn = document.getElementById('exportFloatCloseBtn');
            if (exportCloseBtn) {
                exportCloseBtn.addEventListener('click', closeExportPanel);
            }
            const batchCloseBtn = document.getElementById('batchFloatCloseBtn');
            if (batchCloseBtn) {
                batchCloseBtn.addEventListener('click', closeBatchPanel);
            }

            document.querySelectorAll('.editor-tab-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    switchEditorTab(this.dataset.editorTab);
                });
            });

            document.querySelectorAll('.workspace-action-btn[data-editor-tab]').forEach(btn => {
                btn.addEventListener('click', function(event) {
                    event.stopPropagation();
                    toggleEditorPanel(this.dataset.editorTab);
                });
            });

            const exportRailBtn = document.getElementById('exportRailBtn');
            if (exportRailBtn) {
                exportRailBtn.addEventListener('click', function(event) {
                    event.stopPropagation();
                    toggleExportPanel();
                });
            }

            const batchBtn = document.getElementById('batchBtn');
            if (batchBtn) {
                batchBtn.addEventListener('click', function(event) {
                    event.stopPropagation();
                    toggleBatchPanel();
                });
            }

            const viewLockBtn = document.getElementById('viewLockBtn');
            if (viewLockBtn) {
                viewLockBtn.addEventListener('click', function(event) {
                    event.stopPropagation();
                    toggleViewLock();
                });
            }

            const batchValidateBtn = document.getElementById('batchValidateBtn');
            if (batchValidateBtn) {
                batchValidateBtn.addEventListener('click', validateBatchInput);
            }
            const batchGenerateBtn = document.getElementById('batchGenerateBtn');
            if (batchGenerateBtn) {
                batchGenerateBtn.addEventListener('click', generateBatchCongrats);
            }
            const batchInput = document.getElementById('batchInput');
            if (batchInput) {
                batchInput.addEventListener('input', function() {
                    batchParsedRecords = [];
                    const genBtn = document.getElementById('batchGenerateBtn');
                    if (genBtn) genBtn.disabled = true;
                    const list = document.getElementById('batchReviewList');
                    if (list) list.innerHTML = '';
                    const progress = document.getElementById('batchProgress');
                    if (progress) progress.textContent = '内容已修改，请重新审阅';
                });
            }

            document.addEventListener('keydown', function(event) {
                if (event.key !== 'Escape') return;
                if (isEditorPanelOpen() || isExportPanelOpen() || isFloatPanelOpen('batchOffcanvas')) {
                    closeAllFloatPanels();
                }
            });

            document.addEventListener('pointerdown', function(event) {
                if (!isEditorPanelOpen() && !isExportPanelOpen() && !isFloatPanelOpen('batchOffcanvas')) return;
                const target = event.target;
                if (!(target instanceof Element)) return;
                if (target.closest('.editor-float-panel')) return;
                if (target.closest('.workspace-action-bar')) return;
                if (target.closest('.modal')) return;
                closeAllFloatPanels();
            });
        }

        function initHelpTips() {
            let tipTimer = null;
            let activeTip = null;
            let bubble = document.getElementById('helpTipBubble');
            if (!bubble) {
                bubble = document.createElement('div');
                bubble.id = 'helpTipBubble';
                bubble.className = 'help-tip-bubble';
                bubble.setAttribute('role', 'tooltip');
                document.body.appendChild(bubble);
            }

            function hideTip() {
                if (tipTimer) {
                    clearTimeout(tipTimer);
                    tipTimer = null;
                }
                bubble.classList.remove('is-visible');
                if (activeTip) activeTip.classList.remove('is-open');
                activeTip = null;
            }

            function showTip(icon) {
                const text = icon.getAttribute('data-tip') || '';
                if (!text) return;
                activeTip = icon;
                icon.classList.add('is-open');
                bubble.textContent = text;
                bubble.classList.add('is-visible');
                const rect = icon.getBoundingClientRect();
                const bw = bubble.offsetWidth || 220;
                const bh = bubble.offsetHeight || 40;
                let left = rect.left + rect.width / 2 - bw / 2;
                let top = rect.bottom + 8;
                left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
                if (top + bh > window.innerHeight - 8) {
                    top = rect.top - bh - 8;
                }
                bubble.style.left = `${Math.round(left)}px`;
                bubble.style.top = `${Math.round(top)}px`;
            }

            document.addEventListener('pointerover', function(event) {
                const icon = event.target.closest?.('.help-tip');
                if (!icon) return;
                if (tipTimer) clearTimeout(tipTimer);
                tipTimer = setTimeout(function() {
                    showTip(icon);
                }, 650);
            });
            document.addEventListener('pointerout', function(event) {
                const icon = event.target.closest?.('.help-tip');
                if (!icon) return;
                const related = event.relatedTarget;
                if (related && icon.contains(related)) return;
                hideTip();
            });
            document.addEventListener('scroll', hideTip, true);
            window.addEventListener('resize', hideTip);
        }

        function loadAutoShowPreference() {
            const saved = localStorage.getItem(AUTO_SHOW_KEY);
            autoShowEditorPanel = saved === null ? true : saved === 'true';
            const toggle = document.getElementById('autoShowEditorToggle');
            if (toggle) toggle.checked = autoShowEditorPanel;
        }

        function loadViewLockPreference() {
            const saved = localStorage.getItem(VIEW_LOCK_KEY);
            viewLocked = saved === null ? true : saved === 'true';
            syncViewLockButton();
        }

        function syncViewLockButton() {
            const btn = document.getElementById('viewLockBtn');
            if (!btn) return;
            btn.classList.toggle('is-locked', viewLocked);
            btn.classList.toggle('is-active', viewLocked);
            btn.setAttribute('aria-pressed', viewLocked ? 'true' : 'false');
            btn.textContent = viewLocked ? '锁定' : '解锁';
            btn.title = viewLocked ? '已锁定：不可拖拽平移画布（点击解锁）' : '已解锁：可拖拽平移画布（点击锁定）';
            const panel = document.getElementById('canvasPreviewPanel');
            if (panel) {
                panel.classList.toggle('is-space-pan', !viewLocked && spacePanKey);
                if (viewLocked) {
                    panel.classList.remove('is-panning', 'is-space-pan');
                    isViewPanning = false;
                    spacePanKey = false;
                }
            }
        }

        function toggleViewLock() {
            viewLocked = !viewLocked;
            localStorage.setItem(VIEW_LOCK_KEY, String(viewLocked));
            syncViewLockButton();
        }

        function initAutoShowToggle() {
            const toggle = document.getElementById('autoShowEditorToggle');
            if (!toggle) return;
            toggle.addEventListener('change', function() {
                autoShowEditorPanel = !!this.checked;
                localStorage.setItem(AUTO_SHOW_KEY, String(autoShowEditorPanel));
            });
        }

        function isProtectedCanvasObject(obj) {
            if (!obj || !canvas) return true;
            return obj === backgroundImage || obj === topOverlayImage;
        }

        function isAvatarObject(obj) {
            return !!(obj && (obj.isAvatar || obj.clipTo));
        }

        function openPanelForObject(obj, force) {
            if (!obj) return;
            if (!force && !autoShowEditorPanel) return;
            if (isAvatarObject(obj)) {
                openEditorPanel('avatar');
                return;
            }
            const key = getTextFieldKeyFromObject(obj);
            if (key) {
                selectTextField(key);
                openEditorPanel('text');
            }
        }

        function syncTextObjectsFromCanvas() {
            const next = {};
            canvas.getObjects().forEach(obj => {
                if (obj.fieldKey) next[obj.fieldKey] = obj;
            });
            textObjects = next;
        }

        function captureHistorySnapshot() {
            if (!canvas) return null;
            const companyInput = document.getElementById('dietCompanyName');
            return JSON.stringify({
                canvas: canvas.toJSON(['fieldKey', 'isAvatar']),
                textFieldState: textFieldState,
                dietItems: dietItems,
                dietCompanyName: companyInput ? companyInput.value : '',
                currentTemplateId: currentTemplateId
            });
        }

        function pushHistory() {
            if (historyLock || batchGenerating || !canvas) return;
            const snap = captureHistorySnapshot();
            if (!snap) return;
            if (historyIndex >= 0 && historyStack[historyIndex] === snap) return;
            historyStack = historyStack.slice(0, historyIndex + 1);
            historyStack.push(snap);
            if (historyStack.length > HISTORY_LIMIT) {
                historyStack.shift();
            }
            historyIndex = historyStack.length - 1;
        }

        function restoreHistorySnapshot(snap) {
            if (!canvas || !snap) return;
            let data;
            try {
                data = JSON.parse(snap);
            } catch (e) {
                return;
            }
            historyLock = true;
            canvas.loadFromJSON(data.canvas, function() {
                backgroundImage = null;
                topOverlayImage = null;
                canvas.getObjects().forEach(obj => {
                    if (obj.isAvatar || obj.clipTo) {
                        const left = obj.left;
                        const top = obj.top;
                        const scaleX = obj.scaleX;
                        const scaleY = obj.scaleY;
                        const maxSize = designToCanvasSize(AVATAR_LAYOUT.size);
                        obj.set({
                            isAvatar: true,
                            clipTo: buildAvatarClip(maxSize / 2),
                            left,
                            top,
                            scaleX,
                            scaleY,
                            originX: 'center',
                            originY: 'center',
                            selectable: true,
                            evented: true
                        });
                        obj.setCoords();
                    }
                });
                // 重新识别底图 / 顶层装饰
                const images = canvas.getObjects().filter(o => o.type === 'image' && !o.isAvatar && !o.clipTo);
                backgroundImage = images[0] || null;
                topOverlayImage = images[1] || null;
                images.forEach(img => img.set({ selectable: false, evented: false }));
                if (data.textFieldState) {
                    textFieldState = data.textFieldState;
                }
                if (Array.isArray(data.dietItems)) {
                    dietItems = data.dietItems;
                    renderDietItemsTable();
                }
                if (typeof data.dietCompanyName === 'string') {
                    const companyInput = document.getElementById('dietCompanyName');
                    if (companyInput) companyInput.value = data.dietCompanyName;
                }
                syncTextObjectsFromCanvas();
                Object.keys(textObjects).forEach(key => updateTextObject(key));
                syncCanvasLayerOrder();
                syncInspectorUIFromState(activeFieldKey);
                schedulePreviewUpdate();
                historyLock = false;
                canvas.requestRenderAll();
            });
        }

        function undoCanvasChange() {
            if (historyIndex <= 0) return;
            historyIndex -= 1;
            restoreHistorySnapshot(historyStack[historyIndex]);
        }

        function deleteActiveCanvasObject() {
            if (!canvas) return;
            const active = canvas.getActiveObject();
            if (!active || isProtectedCanvasObject(active)) return;
            const key = getTextFieldKeyFromObject(active);
            pushHistory();
            historyLock = true;
            canvas.remove(active);
            if (key) {
                delete textObjects[key];
                if (textFieldState[key]) textFieldState[key].content = '';
                if (activeFieldKey === key) {
                    const contentEl = document.getElementById('inspectorContent');
                    if (contentEl) contentEl.value = '';
                }
            }
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            historyLock = false;
            pushHistory();
        }

        function initCanvasViewControls() {
            const panel = document.getElementById('canvasPreviewPanel');
            if (!panel || !canvas) return;

            panel.addEventListener('wheel', function(event) {
                if (!(event.ctrlKey || event.metaKey)) return;
                event.preventDefault();
                const delta = event.deltaY > 0 ? -0.08 : 0.08;
                viewUserZoom = Math.min(3, Math.max(0.25, viewUserZoom * (1 + delta)));
                applyCanvasViewTransform();
                updatePreviewScaleLabel(DESIGN_SIZE.width, DESIGN_SIZE.height, canvasPreviewScale);
            }, { passive: false });

            const startPan = function(x, y) {
                isViewPanning = true;
                panLastX = x;
                panLastY = y;
                panel.classList.add('is-panning');
            };
            const movePan = function(x, y) {
                if (!isViewPanning) return;
                viewPanX += x - panLastX;
                viewPanY += y - panLastY;
                panLastX = x;
                panLastY = y;
                applyCanvasViewTransform();
            };
            const endPan = function() {
                if (!isViewPanning) return;
                isViewPanning = false;
                panel.classList.remove('is-panning');
            };

            canvas.on('mouse:down', function(opt) {
                const evt = opt.e;
                if (!evt) return;
                if (viewLocked) return;
                if (evt.button === 1 || spacePanKey || (!opt.target && evt.button === 0)) {
                    startPan(evt.clientX, evt.clientY);
                    canvas.selection = false;
                }
            });
            canvas.on('mouse:move', function(opt) {
                if (viewLocked || !isViewPanning || !opt.e) return;
                movePan(opt.e.clientX, opt.e.clientY);
            });
            canvas.on('mouse:up', function() {
                endPan();
                canvas.selection = true;
            });

            document.addEventListener('keydown', function(event) {
                if (viewLocked) return;
                if (event.code === 'Space' && !event.repeat && !(event.target && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))) {
                    spacePanKey = true;
                    panel.classList.add('is-space-pan');
                    event.preventDefault();
                }
            });
            document.addEventListener('keyup', function(event) {
                if (event.code === 'Space') {
                    spacePanKey = false;
                    panel.classList.remove('is-space-pan');
                    endPan();
                }
            });
        }

        function initHistoryTracking() {
            if (!canvas) return;
            const mark = function() {
                if (historyLock || batchGenerating) return;
                pushHistory();
            };
            canvas.on('object:modified', mark);
            canvas.on('object:added', function() {
                if (historyLock || batchGenerating) return;
                // 延迟一拍，避免初始化连环写入
                setTimeout(mark, 0);
            });
            canvas.on('object:removed', mark);
            // 首快照由 bootstrapTemplateCanvas({ resetHistory: true }) 在模板就绪后写入
        }

        function initCanvasTextInteraction() {
            if (!canvas) return;
            canvas.on('selection:created', function(e) {
                const obj = e.selected[0];
                const key = getTextFieldKeyFromObject(obj);
                if (key) selectTextField(key);
                updateCoordinateDisplay(obj);
                openPanelForObject(obj);
            });
            canvas.on('selection:updated', function(e) {
                const obj = e.selected[0];
                const key = getTextFieldKeyFromObject(obj);
                if (key) selectTextField(key);
                openPanelForObject(obj);
            });
        }
        
        // 从localStorage恢复数据
        function loadFromLocalStorage() {
            const savedRevision = localStorage.getItem('personnelMapRevision');
            const savedPersonnelMap = localStorage.getItem('personnelMap');

            if (savedRevision === PERSONNEL_MAP_REVISION && savedPersonnelMap) {
                Object.keys(PERSONNEL_MAP).forEach(key => delete PERSONNEL_MAP[key]);
                Object.assign(PERSONNEL_MAP, JSON.parse(savedPersonnelMap));
            } else {
                localStorage.setItem('personnelMapRevision', PERSONNEL_MAP_REVISION);
                localStorage.setItem('personnelMap', JSON.stringify(PERSONNEL_MAP));
            }

            // 恢复uploadedAvatars
            const savedAvatars = localStorage.getItem('uploadedAvatars');
            if (savedAvatars) {
                uploadedAvatars = JSON.parse(savedAvatars);
            }
            loadAutoShowPreference();
            loadViewLockPreference();
        }

        function getPhotoLookupName(name) {
            return PHOTO_NAME_ALIASES[name] || name;
        }

        function getPersonRoleHint(name) {
            return PERSONNEL_ROLE_HINT[name] || '';
        }

        let personnelSearchIndex = [];
        let avatarNameSuggestionIndex = -1;

        function rebuildPersonnelSearchIndex() {
            personnelSearchIndex = Object.keys(PERSONNEL_MAP).map(name => {
                const dept = PERSONNEL_MAP[name];
                let initials = '';
                let pinyinFull = '';
                let pinyinText = '';

                if (window.pinyinPro && typeof window.pinyinPro.pinyin === 'function') {
                    try {
                        const pinyinArr = window.pinyinPro.pinyin(name, { toneType: 'none', type: 'array' });
                        initials = pinyinArr.map(part => (part && part[0]) || '').join('').toLowerCase();
                        pinyinFull = pinyinArr.join('').toLowerCase();
                        pinyinText = pinyinArr.join(' ').toLowerCase();
                    } catch (error) {
                        console.warn('拼音索引生成失败:', name, error);
                    }
                }

                return { name, dept, initials, pinyinFull, pinyinText };
            });
        }

        function normalizeSearchQuery(query) {
            return query.trim().toLowerCase().replace(/\s+/g, '');
        }

        function isChineseSubsequence(text, query) {
            if (!query) return false;
            let index = 0;
            for (const ch of query) {
                const found = text.indexOf(ch, index);
                if (found === -1) return false;
                index = found + 1;
            }
            return true;
        }

        function scorePersonMatch(entry, queryRaw) {
            const trimmed = queryRaw.trim();
            const query = normalizeSearchQuery(queryRaw);
            if (!trimmed) return -1;

            const { name, initials, pinyinFull, pinyinText } = entry;

            if (name === trimmed) return 1000;
            if (name.includes(trimmed)) return 900;
            if (isChineseSubsequence(name, trimmed)) return 800;

            if (/^[a-z]+$/.test(query)) {
                if (initials === query) return 850;
                if (initials.startsWith(query)) return 780;
                if (initials.includes(query)) return 720;
                if (pinyinFull.startsWith(query)) return 700;
                if (pinyinFull.includes(query)) return 650;
            }

            if (query && (pinyinText.includes(query) || pinyinFull.includes(query))) {
                return 600;
            }

            return -1;
        }

        function getFilteredPersonnelNames() {
            const selectedDept = document.getElementById('deptFilter')?.value || '';
            return personnelSearchIndex.filter(entry => !selectedDept || entry.dept === selectedDept);
        }

        function searchPersonnel(query) {
            return getFilteredPersonnelNames()
                .map(entry => ({ entry, score: scorePersonMatch(entry, query) }))
                .filter(item => item.score >= 0)
                .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.entry.name.localeCompare(b.entry.name, 'zh-CN', { sensitivity: 'accent' });
                })
                .map(item => item.entry);
        }

        function resolveAvatarNameInput(rawInput) {
            const trimmed = rawInput.trim();
            if (!trimmed) return null;
            if (Object.prototype.hasOwnProperty.call(PERSONNEL_MAP, trimmed)) return trimmed;

            const matched = getFilteredPersonnelNames()
                .map(entry => ({ entry, score: scorePersonMatch(entry, trimmed) }))
                .filter(item => item.score >= 0)
                .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.entry.name.localeCompare(b.entry.name, 'zh-CN', { sensitivity: 'accent' });
                });

            if (matched.length === 1) return matched[0].entry.name;
            if (matched.length > 1 && matched[0].score >= 850 && matched[0].score > matched[1].score) {
                return matched[0].entry.name;
            }
            return null;
        }

        function hideAvatarNameSuggestions() {
            const list = document.getElementById('avatarNameSuggestions');
            if (!list) return;
            list.hidden = true;
            list.innerHTML = '';
            avatarNameSuggestionIndex = -1;
        }

        function selectAvatarNameSuggestion(name) {
            const input = document.getElementById('avatarNameInput');
            input.value = name;
            hideAvatarNameSuggestions();
            previewAvatar();
        }

        function renderAvatarNameSuggestions(results) {
            const list = document.getElementById('avatarNameSuggestions');
            if (!list) return;

            list.innerHTML = '';
            avatarNameSuggestionIndex = -1;

            if (!results.length) {
                list.hidden = true;
                return;
            }

            results.slice(0, 12).forEach((entry, index) => {
                const item = document.createElement('li');
                item.setAttribute('role', 'option');
                item.dataset.index = String(index);
                item.dataset.name = entry.name;
                const roleHint = getPersonRoleHint(entry.name);
                item.title = roleHint || `${entry.name} · ${entry.dept}`;
                item.innerHTML = `<span>${entry.name}</span><span class="suggestion-dept">${entry.dept}</span><span class="suggestion-meta">${entry.initials ? entry.initials.toUpperCase() : ''}${entry.pinyinText ? ' · ' + entry.pinyinText : ''}</span>`;
                item.addEventListener('mousedown', function(event) {
                    event.preventDefault();
                    selectAvatarNameSuggestion(entry.name);
                });
                list.appendChild(item);
            });

            list.hidden = false;
        }

        function updateAvatarNameSuggestions() {
            const input = document.getElementById('avatarNameInput');
            const query = input.value.trim();
            if (!query) {
                hideAvatarNameSuggestions();
                return;
            }
            renderAvatarNameSuggestions(searchPersonnel(query));
        }

        function setActiveAvatarNameSuggestion(index) {
            const list = document.getElementById('avatarNameSuggestions');
            if (!list || list.hidden) return;

            const items = list.querySelectorAll('li');
            if (!items.length) return;

            avatarNameSuggestionIndex = Math.max(0, Math.min(index, items.length - 1));
            items.forEach((item, itemIndex) => {
                item.classList.toggle('active', itemIndex === avatarNameSuggestionIndex);
            });
            items[avatarNameSuggestionIndex].scrollIntoView({ block: 'nearest' });
        }

        function initAvatarNameSearch() {
            const input = document.getElementById('avatarNameInput');
            const list = document.getElementById('avatarNameSuggestions');
            if (!input || !list) return;

            input.addEventListener('input', updateAvatarNameSuggestions);
            input.addEventListener('focus', updateAvatarNameSuggestions);
            input.addEventListener('blur', function() {
                setTimeout(hideAvatarNameSuggestions, 150);
            });
            input.addEventListener('keydown', function(event) {
                const items = list.querySelectorAll('li');
                if (event.key === 'ArrowDown') {
                    if (!list.hidden && items.length) {
                        event.preventDefault();
                        setActiveAvatarNameSuggestion(avatarNameSuggestionIndex + 1);
                    }
                    return;
                }
                if (event.key === 'ArrowUp') {
                    if (!list.hidden && items.length) {
                        event.preventDefault();
                        setActiveAvatarNameSuggestion(avatarNameSuggestionIndex <= 0 ? items.length - 1 : avatarNameSuggestionIndex - 1);
                    }
                    return;
                }
                if (event.key === 'Enter') {
                    if (!list.hidden && items.length && avatarNameSuggestionIndex >= 0) {
                        event.preventDefault();
                        selectAvatarNameSuggestion(items[avatarNameSuggestionIndex].dataset.name);
                        return;
                    }
                    previewAvatar();
                    return;
                }
                if (event.key === 'Escape') {
                    hideAvatarNameSuggestions();
                }
            });
        }

        /**
         * 初始化Fabric.js画布
         */
        function initCanvas() {
            canvas = new fabric.Canvas('canvas', {
                width: DESIGN_SIZE.width,
                height: DESIGN_SIZE.height,
                backgroundColor: '#ffffff',
                preserveObjectStacking: true
            });
            refreshBackgroundFrame();
            resetCanvasViewTransform();
            initCanvasPreviewResize();
            schedulePreviewUpdate();
        }
        /**
         * 处理文件上传
         * @param {File} file - 上传的图片文件
         */
        function handleFileUpload(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                fabric.Image.fromURL(e.target.result, function(img) {
                    canvas.getObjects().filter(obj => obj.clipTo).forEach(obj => canvas.remove(obj));
                    configureAvatarImage(img);
                    canvas.add(img);
                    relayoutCanvasElements();
                    setTimeout(function() {
                        const currentName = getFieldContent('name');
                        const currentDept = getFieldContent('dept');
                        setFieldContent('order', '618活动套餐下单');
                        if (currentName) setFieldContent('name', currentName);
                        if (currentDept) setFieldContent('dept', currentDept);
                    }, 100);
                });
            };
            reader.readAsDataURL(file);
        }
        /**
         * 添加所有文字对象到画布
         */
        function addTextObjects() {
            Object.values(textObjects).forEach(obj => canvas.remove(obj));
            textObjects = {};
            refreshBackgroundFrame();

            Object.keys(TEXT_FIELD_CONFIG).forEach(key => {
                const cfg = TEXT_FIELD_CONFIG[key];
                const preset = STYLE_PRESETS[cfg.stylePreset] || STYLE_PRESETS.body;
                const defaults = {
                    fontSize: designToCanvasSize(preset.fontSize),
                    fontFamily: preset.fontFamily,
                    fill: preset.fontColor,
                    fontWeight: 'bold',
                    textAlign: cfg.vertical ? 'center' : (key === 'congrats' || key === 'header' ? 'left' : 'center')
                };

                if (key === 'name') {
                    defaults.lineHeight = 50 / 40;
                    defaults.shadow = new fabric.Shadow({
                        color: 'rgba(0,0,0,0.3)',
                        blur: designToCanvasSize(5),
                        offsetX: designToCanvasSize(2),
                        offsetY: designToCanvasSize(2)
                    });
                } else if (key === 'dept') {
                    defaults.lineHeight = 58 / 48;
                } else if (key === 'congrats') {
                    defaults.shadow = new fabric.Shadow({
                        color: 'rgba(0,0,0,0.3)',
                        blur: designToCanvasSize(8),
                        offsetX: designToCanvasSize(3),
                        offsetY: designToCanvasSize(3)
                    });
                } else if (key === 'order') {
                    defaults.shadow = new fabric.Shadow({
                        color: 'rgba(0,0,0,0.3)',
                        blur: designToCanvasSize(5),
                        offsetX: designToCanvasSize(2),
                        offsetY: designToCanvasSize(2)
                    });
                } else if (key === 'amount') {
                    defaults.shadow = new fabric.Shadow({
                        color: 'rgba(0,0,0,0.4)',
                        blur: designToCanvasSize(10),
                        offsetX: designToCanvasSize(4),
                        offsetY: designToCanvasSize(4)
                    });
                } else if (key === 'header') {
                    defaults.lineHeight = 1.25;
                } else if (key === 'items') {
                    defaults.lineHeight = 1.35;
                }

                textObjects[key] = new fabric.Text('', Object.assign(defaults, getTextObjectPosition(key)));
                textObjects[key].fieldKey = key;
                canvas.add(textObjects[key]);
            });

            Object.keys(textFieldState).forEach(key => updateTextObject(key));
            syncCanvasLayerOrder();
        }
        /**
         * 更新指定的文字对象
         * @param {string} key - 文字对象的键名
         */
        function updateTextObject(key) {
            if (!textObjects[key]) return;
            refreshBackgroundFrame();
            const state = textFieldState[key];
            if (!state) return;
            let content = state.content;
            const fontFamily = state.fontFamily;
            const fontSize = state.fontSize;
            const fontColor = state.fontColor;
            const scaledFontSize = designToCanvasSize(fontSize);
            const layout = getTextObjectPosition(key);
            if (TEXT_FIELD_CONFIG[key]?.vertical) {
                content = content.split('').join('\n');
                const lineHeight = (fontSize + 10) / fontSize;
                textObjects[key].set(Object.assign({
                    text: content,
                    fontFamily: fontFamily,
                    fontSize: scaledFontSize,
                    fill: fontColor,
                    textAlign: 'center',
                    lineHeight: lineHeight
                }, layout));
            } else {
                textObjects[key].set(Object.assign({
                    text: content,
                    fontFamily: fontFamily,
                    fontSize: scaledFontSize,
                    fill: fontColor
                }, layout));
            }
            textObjects[key].setCoords();
            canvas.renderAll();
        }
        /**
         * 生成导出文件名：喜报_人员姓名_导出日期
         */
        function buildExportFileName() {
            let rawName = '未命名';
            if (currentTemplateId === 'diet') {
                rawName = (
                    document.getElementById('dietCompanyName')?.value ||
                    getFieldContent('header') ||
                    '膳食中心'
                ).trim();
            } else {
                rawName = (
                    getFieldContent('name') ||
                    document.getElementById('avatarNameInput')?.value ||
                    '未命名'
                ).trim();
            }
            const safeName = rawName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '') || '未命名';
            const exportDate = new Date().toISOString().slice(0, 10);
            const prefix = currentTemplateId === 'diet' ? '膳食喜报' : '喜报';
            return `${prefix}_${safeName}_${exportDate}.jpg`;
        }

        function getBatchTemplateText() {
            return [
                '# 个检业绩喜报 · 批量输入模板',
                '# 每行一条；空行与 # 开头行忽略',
                '# 格式：姓名+下单内容 金额：数字元（海报金额会带「元」）',
                '# 姓名须在人员名单中；部门/恭喜语自动生成',
                '# 下单内容示例：签约团检1单 / 开门红套餐下单 / 618活动套餐下单 / "双11"活动套餐下单',
                '#',
                '王莉莉+签约团检1单 金额：20000元',
                '陈炳森+开门红套餐下单 金额：15800元',
                '白金玉+618活动套餐下单 金额：9800元',
                '刘倩倩+"双11"活动套餐下单 金额：12800元'
            ].join('\n');
        }

        function ensureBatchTemplateFilled() {
            const input = document.getElementById('batchInput');
            if (!input) return;
            if (!input.value.trim()) {
                input.value = getBatchTemplateText();
            }
        }

        function suggestPersonnelName(rawName) {
            const trimmed = (rawName || '').trim();
            if (!trimmed) return null;
            if (PERSONNEL_MAP[trimmed]) return trimmed;
            const resolved = resolveAvatarNameInput(trimmed);
            if (resolved) return resolved;
            const fuzzy = searchPersonnel(trimmed);
            if (fuzzy.length) return fuzzy[0].name;
            return null;
        }

        function normalizeOrderText(orderText) {
            let order = (orderText || '').trim().replace(/\s+/g, '');
            if (!order) return '';
            return order;
        }

        function normalizeAmountText(amountText) {
            const raw = String(amountText || '').trim().replace(/,/g, '');
            const num = Number(raw);
            if (!Number.isFinite(num) || num < 0) return null;
            return Number.isInteger(num) ? String(num) : String(Math.round(num * 100) / 100);
        }

        function formatAmountForCanvas(amount) {
            const s = String(amount || '').trim();
            if (!s) return '';
            return /元\s*$/.test(s) ? s : `${s}元`;
        }

        function parseBatchLine(line, lineNo) {
            const raw = line.trim();
            if (!raw || raw.startsWith('#')) {
                return { skip: true, lineNo, raw };
            }

            // 姓名+下单 金额：20000元
            let match = raw.match(/^(.+?)\+(.+?)\s*金额\s*[：:]\s*([0-9]+(?:\.[0-9]+)?)\s*元?\s*$/);
            // 兼容：姓名 下单 金额：xxx
            if (!match) {
                match = raw.match(/^(.+?)[\s,，]+(.+?)\s*金额\s*[：:]\s*([0-9]+(?:\.[0-9]+)?)\s*元?\s*$/);
            }
            if (!match) {
                return {
                    ok: false,
                    lineNo,
                    raw,
                    errors: ['格式不正确。应为：姓名+下单内容 金额：数字元'],
                    hints: ['示例：王莉莉+签约团检1单 金额：20000元']
                };
            }

            const nameRaw = match[1].trim();
            const orderRaw = match[2].trim();
            const amountRaw = match[3].trim();
            const errors = [];
            const hints = [];

            let name = nameRaw;
            if (!PERSONNEL_MAP[name]) {
                const suggested = suggestPersonnelName(nameRaw);
                if (suggested && suggested !== nameRaw) {
                    errors.push(`姓名「${nameRaw}」不在名单中`);
                    hints.push(`可改为「${suggested}」（部门：${PERSONNEL_MAP[suggested]}）`);
                } else if (suggested) {
                    name = suggested;
                } else {
                    errors.push(`姓名「${nameRaw}」不在人员名单中`);
                    hints.push('请检查错别字，或先在「选人 → 维护头像库」添加该人员');
                }
            }

            const order = normalizeOrderText(orderRaw);
            if (!order) {
                errors.push('下单内容不能为空');
            }

            const amount = normalizeAmountText(amountRaw);
            if (amount === null) {
                errors.push(`金额「${amountRaw}」无效，请填写数字`);
            }

            if (errors.length) {
                return { ok: false, lineNo, raw, name: nameRaw, order, amount: amountRaw, errors, hints };
            }

            return {
                ok: true,
                lineNo,
                raw,
                name,
                dept: PERSONNEL_MAP[name],
                order,
                amount,
                congrats: `恭喜：${name}`
            };
        }

        function parseBatchInput(text) {
            const lines = String(text || '').split(/\r?\n/);
            const records = [];
            lines.forEach((line, index) => {
                const parsed = parseBatchLine(line, index + 1);
                if (parsed.skip) return;
                records.push(parsed);
            });
            return records;
        }

        function renderBatchReview(records) {
            const list = document.getElementById('batchReviewList');
            const progress = document.getElementById('batchProgress');
            const genBtn = document.getElementById('batchGenerateBtn');
            if (!list) return;

            list.innerHTML = '';
            const okRecords = records.filter(r => r.ok);
            const badRecords = records.filter(r => !r.ok);

            if (!records.length) {
                list.innerHTML = '<li class="is-error">没有可识别的有效行，请按模板填写</li>';
                if (progress) progress.textContent = '';
                if (genBtn) genBtn.disabled = true;
                batchParsedRecords = [];
                return;
            }

            records.forEach(rec => {
                const li = document.createElement('li');
                li.className = rec.ok ? 'is-ok' : 'is-error';
                if (rec.ok) {
                    li.textContent = `第${rec.lineNo}行 ✓ ${rec.name}｜${rec.dept}｜${rec.order}｜${rec.amount}元`;
                } else {
                    const hintText = (rec.hints || []).join('；');
                    li.innerHTML = `第${rec.lineNo}行 ✗ ${escapeHtml(rec.raw)}<br>${escapeHtml((rec.errors || []).join('；'))}${hintText ? `<br>建议：${escapeHtml(hintText)}` : ''}`;
                }
                list.appendChild(li);
            });

            if (badRecords.length) {
                if (progress) progress.textContent = `审阅未通过：${badRecords.length} 条有误，${okRecords.length} 条正确。请先修改后再生成。`;
                if (genBtn) genBtn.disabled = true;
                batchParsedRecords = [];
            } else {
                if (progress) progress.textContent = `审阅通过：共 ${okRecords.length} 条，可生成喜报。`;
                if (genBtn) genBtn.disabled = false;
                batchParsedRecords = okRecords;
            }
        }

        function validateBatchInput(options = {}) {
            if (currentTemplateId !== 'individual') {
                alert('批量生成目前仅支持「个检业绩喜报」，请先切换模板。');
                return false;
            }
            const input = document.getElementById('batchInput');
            const records = parseBatchInput(input ? input.value : '');
            renderBatchReview(records);
            const autoGenerate = options.autoGenerate !== false;
            if (autoGenerate && batchParsedRecords.length) {
                generateBatchCongrats();
                return true;
            }
            return batchParsedRecords.length > 0;
        }

        function loadAvatarImageForName(name) {
            return new Promise(function(resolve) {
                if (uploadedAvatars[name]) {
                    const img = new Image();
                    const src = uploadedAvatars[name];
                    img.onload = function() { resolve(img); };
                    img.onerror = function() { resolve(null); };
                    // data URL 不设 crossOrigin，避免部分浏览器加载失败
                    if (src && !String(src).startsWith('data:')) {
                        img.crossOrigin = 'anonymous';
                    }
                    img.src = src;
                    return;
                }
                const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
                const photoName = getPhotoLookupName(name);
                let index = 0;
                function tryNext() {
                    if (index >= extensions.length) {
                        resolve(null);
                        return;
                    }
                    const url = `https://raw.githubusercontent.com/Nmfengtongxue/daily_imgs/main/${photoName}${extensions[index++]}`;
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = function() {
                        if (img.width === 0 || img.height === 0) tryNext();
                        else resolve(img);
                    };
                    img.onerror = tryNext;
                    img.src = url;
                }
                tryNext();
            });
        }

        function waitFrames(count) {
            return new Promise(function(resolve) {
                let left = count || 2;
                function tick() {
                    left -= 1;
                    if (left <= 0) resolve();
                    else requestAnimationFrame(tick);
                }
                requestAnimationFrame(tick);
            });
        }

        function applyBatchRecordToCanvas(record) {
            return loadAvatarImageForName(record.name).then(function(imgEl) {
                setFieldContent('name', record.name);
                setFieldContent('dept', record.dept);
                setFieldContent('order', record.order);
                setFieldContent('amount', formatAmountForCanvas(record.amount));
                updateCongratsText();

                canvas.getObjects().filter(obj => obj.clipTo || obj.isAvatar).forEach(obj => canvas.remove(obj));
                if (imgEl) {
                    return new Promise(function(resolve) {
                        fabric.Image.fromURL(imgEl.src, function(img) {
                            configureAvatarImage(img);
                            canvas.add(img);
                            relayoutCanvasElements({ schedulePreview: false });
                            resolve(true);
                        }, { crossOrigin: 'anonymous' });
                    });
                }
                relayoutCanvasElements({ schedulePreview: false });
                return false;
            });
        }

        function exportToJPGAsync(options = {}) {
            return new Promise(function(resolve, reject) {
                if (!backgroundImage) {
                    reject(new Error('底图未加载'));
                    return;
                }
                const exportWidth = parseInt(document.getElementById('exportWidth').value, 10) || DESIGN_SIZE.width;
                const exportHeight = parseInt(document.getElementById('exportHeight').value, 10) || DESIGN_SIZE.height;
                const multiplier = exportWidth / DESIGN_SIZE.width;
                let dataUrl;
                try {
                    dataUrl = withDesignCanvas(function() {
                        return canvas.toDataURL({
                            format: 'jpeg',
                            quality: 0.9,
                            multiplier: multiplier
                        });
                    });
                } catch (err) {
                    reject(err);
                    return;
                }

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = exportWidth;
                tempCanvas.height = exportHeight;
                const tempCtx = tempCanvas.getContext('2d');
                const exportImage = new Image();
                exportImage.onload = function() {
                    tempCtx.drawImage(exportImage, 0, 0, exportWidth, exportHeight);
                    const downloadName = options.fileName || buildExportFileName();
                    tempCanvas.toBlob(function(blob) {
                        if (!blob) {
                            reject(new Error('导出失败'));
                            return;
                        }
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = downloadName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        resolve(downloadName);
                    }, 'image/jpeg', 0.9);
                };
                exportImage.onerror = function() {
                    reject(new Error('导出图片加载失败'));
                };
                exportImage.src = dataUrl;
            });
        }

        async function generateBatchCongrats() {
            if (batchGenerating) return;
            if (currentTemplateId !== 'individual') {
                alert('批量生成目前仅支持「个检业绩喜报」');
                return;
            }
            if (!batchParsedRecords.length) {
                validateBatchInput();
                if (!batchParsedRecords.length) return;
            }

            batchGenerating = true;
            historyLock = true;
            const genBtn = document.getElementById('batchGenerateBtn');
            const validateBtn = document.getElementById('batchValidateBtn');
            const progress = document.getElementById('batchProgress');
            if (genBtn) genBtn.disabled = true;
            if (validateBtn) validateBtn.disabled = true;

            let success = 0;
            let failed = 0;
            try {
                for (let i = 0; i < batchParsedRecords.length; i++) {
                    const rec = batchParsedRecords[i];
                    if (progress) {
                        progress.textContent = `正在生成 ${i + 1}/${batchParsedRecords.length}：${rec.name}…`;
                    }
                    try {
                        const hasAvatar = await applyBatchRecordToCanvas(rec);
                        await waitFrames(3);
                        const fileName = `喜报_${rec.name}_${rec.amount}_${new Date().toISOString().slice(0, 10)}.jpg`;
                        await exportToJPGAsync({ fileName });
                        success += 1;
                        if (!hasAvatar && progress) {
                            progress.textContent = `第 ${i + 1} 条「${rec.name}」已导出（未找到头像，仅文字）`;
                            await new Promise(r => setTimeout(r, 350));
                        } else {
                            await new Promise(r => setTimeout(r, 250));
                        }
                    } catch (err) {
                        console.error(err);
                        failed += 1;
                    }
                }
            } finally {
                batchGenerating = false;
                historyLock = false;
                schedulePreviewUpdate();
                pushHistory();
                if (validateBtn) validateBtn.disabled = false;
                if (genBtn) genBtn.disabled = false;
                if (progress) {
                    progress.textContent = `完成：成功 ${success} 条${failed ? `，失败 ${failed} 条` : ''}。`;
                }
            }
        }

        /**
         * 导出为JPG图片
         */
        function exportToJPG() {
            exportToJPGAsync().catch(function(err) {
                alert(err.message || '导出失败');
            });
        }
        /**
         * 重置画布
         * 功能：清空画布，重置背景图片和文字对象，清空输入框
         */
        function resetCanvas() {
            const template = getCurrentTemplate();
            applyTemplateRuntimeConfig(template.id);
            textObjects = {};
            initTextFieldState();
            refreshInspectorFieldSelect();
            syncInspectorUIFromState(activeFieldKey);
            bootstrapTemplateCanvas({
                template: template,
                resetHistory: true,
                resetDiet: template.id === 'diet'
            });
        }
        /**
         * 更新恭喜文字
         * 当姓名输入框内容变化时自动调用
         */
        function updateCongratsText() {
            const name = getFieldContent('name');
            if (name) {
                textFieldState.congrats.content = `恭喜：${name}`;
                if (activeFieldKey === 'congrats') {
                    const contentEl = document.getElementById('inspectorContent');
                    if (contentEl) contentEl.value = textFieldState.congrats.content;
                }
                updateTextObject('congrats');
            } else {
                textFieldState.congrats.content = '';
                if (activeFieldKey === 'congrats') {
                    const contentEl = document.getElementById('inspectorContent');
                    if (contentEl) contentEl.value = '';
                }
                updateTextObject('congrats');
            }
        }
        /**
         * 键盘：方向键微调文字；Delete 删除；⌘/Ctrl+Z 撤销
         */
        function handleKeydown(e) {
            const tag = (e.target && e.target.tagName) || '';
            const typing = /INPUT|TEXTAREA|SELECT/.test(tag) || e.target?.isContentEditable;
            if (typing) return;

            const meta = e.metaKey || e.ctrlKey;
            if (meta && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
                e.preventDefault();
                undoCanvasChange();
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (!canvas?.getActiveObject()) return;
                e.preventDefault();
                deleteActiveCanvasObject();
                return;
            }

            const activeObject = canvas?.getActiveObject();
            if (!activeObject) return;
            if (activeObject.type !== 'i-text' && activeObject.type !== 'text') return;
            const step = 5;
            let moved = false;
            switch (e.key) {
                case 'ArrowUp':
                    activeObject.set('top', activeObject.top - step);
                    moved = true;
                    break;
                case 'ArrowDown':
                    activeObject.set('top', activeObject.top + step);
                    moved = true;
                    break;
                case 'ArrowLeft':
                    activeObject.set('left', activeObject.left - step);
                    moved = true;
                    break;
                case 'ArrowRight':
                    activeObject.set('left', activeObject.left + step);
                    moved = true;
                    break;
                default:
                    return;
            }
            if (!moved) return;
            e.preventDefault();
            activeObject.setCoords();
            canvas.renderAll();
            updateCoordinateDisplay(activeObject);
            pushHistory();
        }
        /**
         * 更新坐标显示
         * @param {Object} obj - 选中的对象
         */
        function updateCoordinateDisplay(obj) {
            // 创建或更新坐标显示元素
            let coordDisplay = document.getElementById('coordinateDisplay');
            if (!coordDisplay) {
                coordDisplay = document.createElement('div');
                coordDisplay.id = 'coordinateDisplay';
                coordDisplay.style.position = 'fixed';
                coordDisplay.style.bottom = '10px';
                coordDisplay.style.left = '10px';
                coordDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                coordDisplay.style.color = 'white';
                coordDisplay.style.padding = '8px 12px';
                coordDisplay.style.borderRadius = '4px';
                coordDisplay.style.fontSize = '12px';
                coordDisplay.style.zIndex = '1000';
                document.body.appendChild(coordDisplay);
            }
            // 更新坐标信息
            coordDisplay.textContent = `X: ${Math.round(obj.left)}, Y: ${Math.round(obj.top)}`;
        }
        /**
         * 初始化事件监听
         */
        function initEventListeners() {
            // 按钮事件
            document.getElementById('exportBtn').addEventListener('click', exportToJPG);
            document.getElementById('resetBtn').addEventListener('click', resetCanvas);
            document.addEventListener('keydown', handleKeydown);
            initCanvasTextInteraction();
            initCanvasViewControls();
            initHistoryTracking();
            initAutoShowToggle();
            canvas.on('object:moving', function(e) {
                updateCoordinateDisplay(e.target);
            });
            canvas.on('object:modified', function() {
                // history 已在 initHistoryTracking 统一记录
            });
            
            rebuildPersonnelSearchIndex();
            initNameDropdown();
            initAvatarNameSearch();
            // 头像管理功能事件监听
            // 预览头像按钮
            document.getElementById('previewAvatarBtn').addEventListener('click', previewAvatar);
            // 确认并继续改文字按钮
            document.getElementById('confirmAvatarBtn').addEventListener('click', uploadAvatarToCanvas);
            // 上传图片并设置姓名按钮
            document.getElementById('uploadImageWithNameBtn').addEventListener('click', uploadImageWithName);
            // 删除人员按钮
            document.getElementById('deletePersonBtn').addEventListener('click', deletePerson);
            // 查看所有人员按钮
            document.getElementById('viewAllPersonsBtn').addEventListener('click', viewAllPersons);
            // 关闭模态框按钮
            document.querySelector('.close').addEventListener('click', function() {
                document.getElementById('personListModal').style.display = 'none';
            });
            // 点击模态框外部关闭
            window.addEventListener('click', function(event) {
                const modal = document.getElementById('personListModal');
                if (event.target == modal) {
                    modal.style.display = 'none';
                }
            });
        }
        

        function continueToTextAfterAvatar() {
            const nextField = TEXT_FIELD_CONFIG.amount ? 'amount' : (TEXT_FIELD_CONFIG.order ? 'order' : Object.keys(TEXT_FIELD_CONFIG)[0]);
            if (nextField) selectTextField(nextField);
            openEditorPanel('text');
            requestAnimationFrame(function() {
                const contentInput = document.getElementById('inspectorContent');
                if (contentInput) {
                    contentInput.focus();
                    contentInput.select();
                }
            });
        }

        function applyCurrentAvatarAndContinue(options = {}) {
            if (!currentPreviewAvatar) return Promise.reject(new Error('no preview'));
            const { name, image } = currentPreviewAvatar;
            if (!image || image.width === 0 || image.height === 0) {
                return Promise.reject(new Error('invalid image'));
            }
            return fetch(image.src)
                .then(response => response.blob())
                .then(blob => {
                    const file = new File([blob], `${name}.png`, { type: blob.type });
                    handleFileUpload(file);
                    const tip = document.getElementById('avatarTip');
                    if (tip) {
                        tip.textContent = `【${name}】头像已上画布，请继续改金额/下单`;
                        tip.style.color = '#28a745';
                    }
                    if (options.continueToText !== false) {
                        continueToTextAfterAvatar();
                    }
                });
        }

        /**
         * 预览头像（统一走 loadAvatarImageForName，保证 CORS）
         */
        function previewAvatar() {
            const inputEl = document.getElementById('avatarNameInput');
            let nameInput = inputEl.value.trim();
            const previewArea = document.getElementById('avatarPreviewArea');
            const confirmBtn = document.getElementById('confirmAvatarBtn');
            const avatarTip = document.getElementById('avatarTip');

            previewArea.innerHTML = '';
            confirmBtn.disabled = true;
            avatarTip.textContent = '';
            currentPreviewAvatar = null;

            if (!nameInput) {
                avatarTip.textContent = '请输入姓名！';
                return;
            }

            const resolvedName = resolveAvatarNameInput(nameInput);
            if (!resolvedName) {
                const results = searchPersonnel(nameInput);
                if (results.length > 0) {
                    renderAvatarNameSuggestions(results);
                    avatarTip.textContent = results.length === 1
                        ? '已找到 1 个匹配，请从建议列表选择或按 Enter 预览'
                        : `找到 ${results.length} 个匹配，请选择具体姓名`;
                    avatarTip.style.color = '#ffc107';
                    return;
                }
                avatarTip.textContent = `暂无【${nameInput}】的信息，请检查姓名！`;
                return;
            }

            if (resolvedName !== nameInput) {
                inputEl.value = resolvedName;
            }
            nameInput = resolvedName;
            hideAvatarNameSuggestions();

            if (!PERSONNEL_MAP.hasOwnProperty(nameInput)) {
                avatarTip.textContent = `暂无【${nameInput}】的信息，请检查姓名！`;
                return;
            }

            const token = ++previewAvatarToken;
            avatarTip.textContent = '正在加载头像…';
            avatarTip.style.color = '#6c757d';

            loadAvatarImageForName(nameInput).then(function(img) {
                if (token !== previewAvatarToken) return;
                if (!img || img.width === 0 || img.height === 0) {
                    previewArea.innerHTML = '<span style="color: #6c757d; font-size: 14px;">头像未找到</span>';
                    avatarTip.textContent = `未找到【${nameInput}】的头像图片，请使用"上传并保存"功能！`;
                    avatarTip.style.color = '#ffc107';
                    confirmBtn.disabled = true;
                    currentPreviewAvatar = null;
                    return;
                }

                previewArea.innerHTML = '';
                previewArea.appendChild(img);
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                confirmBtn.disabled = false;
                currentPreviewAvatar = {
                    name: nameInput,
                    dept: PERSONNEL_MAP[nameInput],
                    image: img
                };
                const fromLocal = !!uploadedAvatars[nameInput];
                avatarTip.textContent = fromLocal
                    ? `找到【${nameInput}】的信息（本地存储），部门：${PERSONNEL_MAP[nameInput]}`
                    : `找到【${nameInput}】的信息，部门：${PERSONNEL_MAP[nameInput]}`;
                avatarTip.style.color = '#28a745';
                setFieldContent('name', nameInput);
                setFieldContent('dept', PERSONNEL_MAP[nameInput]);
            });
        }
        
        /**
         * 上传头像到画布
         */
        function uploadAvatarToCanvas() {
            if (!currentPreviewAvatar) {
                document.getElementById('avatarTip').textContent = '请先预览有效头像！';
                document.getElementById('avatarTip').style.color = '#dc3545';
                return;
            }
            applyCurrentAvatarAndContinue().catch(function(error) {
                console.error('获取头像文件失败:', error);
                document.getElementById('avatarTip').textContent = '获取头像文件失败！';
                document.getElementById('avatarTip').style.color = '#dc3545';
            });
        }
        
        /**
         * 初始化姓名下拉列表
         */
        function initNameDropdown() {
            const nameFilter = document.getElementById('nameFilter');
            const names = Object.keys(PERSONNEL_MAP).sort((a, b) => {
                // 按拼音首字母排序
                return a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' });
            });
            
            // 清空现有选项
            nameFilter.innerHTML = '<option value="">请选择姓名</option>';
            
            // 添加排序后的姓名选项
            names.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                const roleHint = getPersonRoleHint(name);
                if (roleHint) option.title = roleHint;
                nameFilter.appendChild(option);
            });
            rebuildPersonnelSearchIndex();
        }
        
        /**
         * 按部门筛选姓名
         */
        function filterNamesByDepartment() {
            const deptFilter = document.getElementById('deptFilter');
            const nameFilter = document.getElementById('nameFilter');
            const selectedDept = deptFilter.value;
            
            // 清空现有选项
            nameFilter.innerHTML = '<option value="">请选择姓名</option>';
            
            // 筛选并排序姓名
            const filteredNames = Object.keys(PERSONNEL_MAP).filter(name => {
                return !selectedDept || PERSONNEL_MAP[name] === selectedDept;
            }).sort((a, b) => {
                // 按拼音首字母排序
                return a.localeCompare(b, 'zh-CN', { sensitivity: 'accent' });
            });
            
            // 添加筛选后的姓名选项
            filteredNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                const roleHint = getPersonRoleHint(name);
                if (roleHint) option.title = roleHint;
                nameFilter.appendChild(option);
            });
            rebuildPersonnelSearchIndex();
        }
        
        /**
         * 上传图片并保存人员信息
         */
        function uploadImageWithName() {
            const fileInput = document.getElementById('avatarFileInput');
            const nameInput = document.getElementById('avatarReverseName').value.trim();
            const deptInput = document.getElementById('avatarReverseDept').value;
            const avatarTip = document.getElementById('avatarTip');
            
            // 校验
            if (!fileInput.files || fileInput.files.length === 0) {
                avatarTip.textContent = '请选择要上传的图片！';
                avatarTip.style.color = '#dc3545';
                return;
            }
            
            if (!nameInput) {
                avatarTip.textContent = '请输入姓名！';
                avatarTip.style.color = '#dc3545';
                return;
            }
            
            // 保存到PERSONNEL_MAP
            PERSONNEL_MAP[nameInput] = deptInput;
            
            // 重新初始化姓名下拉列表
            initNameDropdown();
            
            // 保存PERSONNEL_MAP到localStorage
            localStorage.setItem('personnelMapRevision', PERSONNEL_MAP_REVISION);
            localStorage.setItem('personnelMap', JSON.stringify(PERSONNEL_MAP));
            
            // 处理文件上传（仅用于预览，实际保存需要服务器支持）
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    // 显示预览
                    const previewArea = document.getElementById('avatarPreviewArea');
                    previewArea.innerHTML = '';
                    previewArea.style.backgroundColor = '#f8f9fa';
                    
                    const imgElement = document.createElement('img');
                    imgElement.src = e.target.result;
                    imgElement.style.width = '100%';
                    imgElement.style.height = '100%';
                    imgElement.style.objectFit = 'cover';
                    previewArea.appendChild(imgElement);
                    
                    // 启用确认按钮
                    document.getElementById('confirmAvatarBtn').disabled = false;
                    
                    // 存储当前预览的头像信息
                    currentPreviewAvatar = {
                        name: nameInput,
                        url: e.target.result
                    };
                    
                    // 保存头像数据到uploadedAvatars
                    uploadedAvatars[nameInput] = e.target.result;
                    // 保存uploadedAvatars到localStorage
                    localStorage.setItem('uploadedAvatars', JSON.stringify(uploadedAvatars));
                    
                    // 更新提示
                    avatarTip.textContent = `已上传图片并保存姓名【${nameInput}】，部门: ${deptInput}`;
                    avatarTip.style.color = '#28a745';
                    
                    // 自动填充姓名和部门
                    setFieldContent('name', nameInput);
                    setFieldContent('dept', deptInput);
                };
                img.onerror = function() {
                    avatarTip.textContent = '图片加载失败，请重试！';
                    avatarTip.style.color = '#dc3545';
                };
                img.src = e.target.result;
            };
            
            reader.onerror = function() {
                avatarTip.textContent = '文件读取失败，请重试！';
                avatarTip.style.color = '#dc3545';
            };
            
            reader.readAsDataURL(file);
        }
        
        /**
         * 删除人员
         */
        function deletePerson() {
            const nameInput = document.getElementById('avatarNameInput').value.trim();
            const avatarTip = document.getElementById('avatarTip');
            
            if (!nameInput) {
                avatarTip.textContent = '请输入要删除的人员姓名！';
                avatarTip.style.color = '#dc3545';
                return;
            }
            
            if (PERSONNEL_MAP.hasOwnProperty(nameInput)) {
                delete PERSONNEL_MAP[nameInput];
                // 同时从uploadedAvatars中删除
                if (uploadedAvatars.hasOwnProperty(nameInput)) {
                    delete uploadedAvatars[nameInput];
                    // 更新localStorage中的uploadedAvatars
                    localStorage.setItem('uploadedAvatars', JSON.stringify(uploadedAvatars));
                }
                // 更新localStorage中的PERSONNEL_MAP
                localStorage.setItem('personnelMapRevision', PERSONNEL_MAP_REVISION);
                localStorage.setItem('personnelMap', JSON.stringify(PERSONNEL_MAP));
                // 重新初始化姓名下拉列表
                initNameDropdown();
                // 清空输入
                document.getElementById('avatarNameInput').value = '';
                document.getElementById('avatarPreviewArea').innerHTML = '<span style="color: #6c757d; font-size: 14px;">头像预览</span>';
                document.getElementById('confirmAvatarBtn').disabled = true;
                currentPreviewAvatar = null;
                // 更新提示
                avatarTip.textContent = `已成功删除人员【${nameInput}】`;
                avatarTip.style.color = '#28a745';
            } else {
                avatarTip.textContent = `未找到人员【${nameInput}】`;
                avatarTip.style.color = '#dc3545';
            }
        }
        
        /**
         * 查看所有人员
         */
        function viewAllPersons() {
            const modal = document.getElementById('personListModal');
            const content = document.getElementById('personListContent');
            
            // 按部门分组
            const deptGroups = {};
            Object.keys(PERSONNEL_MAP).forEach(name => {
                const dept = PERSONNEL_MAP[name];
                if (!deptGroups[dept]) {
                    deptGroups[dept] = [];
                }
                deptGroups[dept].push(name);
            });
            
            // 生成HTML内容
            let html = '<div style="font-size: 14px;">';
            Object.keys(deptGroups).sort().forEach(dept => {
                html += `<h5 style="margin-top: 15px; margin-bottom: 5px; color: #007bff;">${dept}</h5>`;
                html += '<ul style="margin: 0; padding-left: 20px;">';
                deptGroups[dept].sort((a, b) => a.localeCompare(b, 'zh-CN')).forEach(name => {
                    const roleHint = getPersonRoleHint(name);
                    const safeName = escapeHtml(name);
                    const safeHint = escapeHtml(roleHint);
                    html += roleHint ? `<li title="${safeHint}">${safeName}</li>` : `<li>${safeName}</li>`;
                });
                html += '</ul>';
            });
            html += '</div>';

            if (updateLogs.length > 0) {
                html += '<hr style="margin: 20px 0;">';
                html += '<h5 style="color: #6c757d; margin-bottom: 10px;">更新记录</h5>';
                html += '<ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #495057;">';
                updateLogs.forEach(log => {
                    html += `<li style="margin-bottom: 8px;">${log}</li>`;
                });
                html += '</ul>';
            }
            
            content.innerHTML = html;
            modal.style.display = 'block';
        }
        /**
         * 初始化页面布局：Offcanvas 工作区 + Inspector
         */
        function initPageLayout() {
            applyTemplateRuntimeConfig(currentTemplateId);
            initTextFieldState();
            initInspectorUI();
            initTemplateSelector();
            initDietItemsPanel();
            updateTemplateActionBar();
            initOffcanvasPanels();
            initHelpTips();
            schedulePreviewUpdate();
        }

        /**
         * 页面加载完成后初始化
         */
        window.addEventListener('DOMContentLoaded', function() {
            initPageLayout();
            loadFromLocalStorage();
            initCanvas();
            initEventListeners();
            whenDocumentFontsReady().then(function() {
                return bootstrapTemplateCanvas({ resetHistory: true });
            }).then(function(template) {
                if (template) {
                    console.log('默认模板已就绪:', template.id);
                }
            }).catch(function(err) {
                console.error('模板启动失败:', err);
            });
        });
