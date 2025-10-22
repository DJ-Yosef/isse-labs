document.addEventListener('DOMContentLoaded', () => {
	// 配置
	const API_BASE = 'http://127.0.0.1:5000';
	const tasksContainer = document.getElementById('tasksContainer');
	const titleInput = document.getElementById('titleInput');
	const categorySelect = document.getElementById('categorySelect');
	const prioritySelect = document.getElementById('prioritySelect');
	const dueInput = document.getElementById('dueInput');
	const addBtn = document.getElementById('addBtn');
	const sortSelect = document.getElementById('sortSelect');
	const filterCategory = document.getElementById('filterCategory');
	const filterPriority = document.getElementById('filterPriority');
	const refreshBtn = document.getElementById('refreshBtn');
	const clearBtn = document.getElementById('clearBtn');
	const themeSwitch = document.getElementById('themeSwitch');

	let tasks = [];

	// 主题切换
	themeSwitch.addEventListener('change', () => {
		document.body.setAttribute('data-theme', themeSwitch.checked ? 'dark' : 'light');
	});

	// 安全的文本转义
	function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }
	function formatDate(d){ if(!d) return ''; try{ const dt=new Date(d); if(isNaN(dt)) return d; return dt.toLocaleString(); }catch(e){return d;} }

	// 加载任务
	async function loadTasks(){
		const cat = filterCategory.value;
		const pr = filterPriority.value;
		try{
			const res = await fetch(`${API_BASE}/tasks`);
			const json = await res.json();
			tasks = json.data || [];
			if (pr) tasks = tasks.filter(t => (t.priority || '') === pr);
			if (cat) tasks = tasks.filter(t => (t.category || '') === cat);
			renderTasks();
		}catch(e){
			tasksContainer.innerHTML = '<div class="muted">无法连接后端，请确保 Flask 在运行并允许跨域 (CORS)</div>';
		}
	}

	// 渲染任务列表
	function renderTasks(){
		const sort = sortSelect.value;
		let list = [...tasks];

		// 旗标置顶
		list.sort((a,b) => (b.flag === true) - (a.flag === true));

		// 排序策略
		if (sort === 'name_asc') list.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
		else if (sort === 'name_desc') list.sort((a,b)=> (b.title||'').localeCompare(a.title||''));
		else if (sort === 'created_asc') list.sort((a,b)=> new Date(a.created_at||0) - new Date(b.created_at||0));
		else if (sort === 'created_desc') list.sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
		else if (sort === 'due_asc') list.sort((a,b)=> new Date(a.due_date||0) - new Date(b.due_date||0));
		else if (sort === 'due_desc') list.sort((a,b)=> new Date(b.due_date||0) - new Date(a.due_date||0));
		else if (sort === 'priority') {
			const rank = p => (p === 'high') ? 3 : (p === 'medium') ? 2 : (p === 'low') ? 1 : 0;
			list.sort((a,b) => rank(b.priority || '') - rank(a.priority || ''));
		}

		// 未完成在前，已完成在后（稳定）
		list.sort((a,b)=> (a.completed === b.completed) ? 0 : (a.completed ? 1 : -1));

		tasksContainer.innerHTML = '';
		if (!list.length) {
			tasksContainer.innerHTML = '<div class="muted">未找到任务</div>';
			return;
		}

		for (const t of list){
			const div = document.createElement('div');
			div.className = 'task card';
			const titleClass = t.completed ? 'title completed' : 'title';
			div.innerHTML = `
				<div style="display:flex;align-items:center;gap:8px;">
					${t.flag ? '<span class="flag">🚩</span>' : ''}
					${t.star ? '<span class="star">★</span>' : ''}
				</div>
				<div class="meta">
					<div class="${titleClass}">${escapeHtml(t.title || '(无标题)')}</div>
					<div class="muted">${escapeHtml(t.category || '无分类')} · 优先:${escapeHtml(t.priority || '无')} · 创建:${formatDate(t.created_at)} ${t.due_date ? '· 到期:' + formatDate(t.due_date) : ''}</div>
				</div>
				<div class="status">
					<div class="muted">${t.completed ? '已完成' : '未完成'}</div>
					<div class="actions">
						<button data-id="${t.id}" class="toggleBtn">${t.completed ? '取消完成' : '标为完成'}</button>
						<button data-id="${t.id}" class="starBtn">${t.star ? '取消星' : '标星'}</button>
						<button data-id="${t.id}" class="flagBtn">${t.flag ? '取消置顶' : '置顶'}</button>
						<button data-id="${t.id}" class="editBtn">编辑</button>
						<button data-id="${t.id}" class="delBtn" style="background:#ff4d4f">删除</button>
					</div>
				</div>
			`;
			if (!t.completed) div.style.opacity = 0.92;

			// 绑定事件
			div.querySelector('.toggleBtn').addEventListener('click', ()=> toggleComplete(t.id));
			div.querySelector('.starBtn').addEventListener('click', ()=> toggleField(t.id, 'star', !t.star));
			div.querySelector('.flagBtn').addEventListener('click', ()=> toggleField(t.id, 'flag', !t.flag));
			div.querySelector('.editBtn').addEventListener('click', ()=> editTaskDialog(t));
			div.querySelector('.delBtn').addEventListener('click', ()=> deleteTask(t.id));
			tasksContainer.appendChild(div);
		}
	}

	// 添加任务
	addBtn.addEventListener('click', async ()=>{
		const title = titleInput.value.trim();
		if (!title){ alert('请填写标题'); return; }
		const payload = {
			title,
			category: categorySelect.value || '',
			priority: prioritySelect.value || '',
			due_date: dueInput.value ? new Date(dueInput.value).toISOString() : null,
			flag: false,
			star: false
		};
		try{
			await fetch(`${API_BASE}/tasks`, {
				method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
			});
			await loadTasks();
			clearInputs();
		}catch(e){
			alert('请求失败，请检查后端是否启动');
		}
	});

	function clearInputs(){ titleInput.value=''; categorySelect.value=''; prioritySelect.value=''; dueInput.value=''; }

	// 切换完成(后端 PUT 切换)
	async function toggleComplete(id){
		await fetch(`${API_BASE}/tasks/${id}`, { method: 'PUT' });
		await loadTasks();
	}

	// 切换字段 (PATCH)
	async function toggleField(id, field, value){
		await fetch(`${API_BASE}/tasks/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({[field]: value}) });
		await loadTasks();
	}

	// 删除
	async function deleteTask(id){
		if (!confirm('确认删除？')) return;
		await fetch(`${API_BASE}/tasks/${id}`, { method:'DELETE' });
		await loadTasks();
	}

	// 编辑对话（简化，使用 prompt）
	async function editTaskDialog(task){
		const newTitle = prompt('标题', task.title || '');
		if (newTitle === null) return;
		const newCategory = prompt('分类', task.category || '') ?? '';
		const newPriority = prompt('优先级 (low/medium/high)', task.priority || '') ?? '';
		const newDue = prompt('到期（ISO 或 空）', task.due_date || '') ?? '';
		const update = { title: newTitle, category: newCategory, priority: newPriority, due_date: newDue || null };
		await fetch(`${API_BASE}/tasks/${task.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(update) });
		await loadTasks();
	}

	// 自定义下拉组件（保留原生 select 用于取值）
	function createCustomSelect(select){
		const wrapper = document.createElement('div');
		wrapper.className = 'custom-select';
		const trigger = document.createElement('button');
		trigger.type = 'button';
		trigger.className = 'custom-select__trigger';
		const label = document.createElement('span');
		label.className = 'label';
		label.textContent = select.options[select.selectedIndex]?.text || '';
		const arrow = document.createElement('span');
		arrow.className = 'arrow';
		trigger.appendChild(label);
		trigger.appendChild(arrow);

		const opts = document.createElement('div');
		opts.className = 'custom-options';
		Array.from(select.options).forEach(opt => {
			const o = document.createElement('div');
			o.className = 'custom-option';
			o.dataset.value = opt.value;
			o.textContent = opt.text;
			if (opt.disabled) o.classList.add('disabled');
			if (opt.selected) o.classList.add('selected');
			o.addEventListener('click', ()=>{
				select.value = opt.value;
				select.dispatchEvent(new Event('change', { bubbles: true }));
				label.textContent = opt.text;
				Array.from(opts.children).forEach(c=>c.classList.toggle('selected', c===o));
				wrapper.classList.remove('open');
			});
			opts.appendChild(o);
		});

		select.parentNode.insertBefore(wrapper, select.nextSibling);
		wrapper.appendChild(trigger);
		wrapper.appendChild(opts);

		select.classList.add('hidden-select');

		trigger.addEventListener('click', (e)=>{
			e.stopPropagation();
			document.querySelectorAll('.custom-select.open').forEach(cs => { if (cs !== wrapper) cs.classList.remove('open'); });
			wrapper.classList.toggle('open');
		});

		document.addEventListener('click', (e)=>{ if (!wrapper.contains(e.target)) wrapper.classList.remove('open'); });

		select.addEventListener('change', ()=>{
			const selOpt = select.options[select.selectedIndex];
			label.textContent = selOpt ? selOpt.text : '';
			Array.from(opts.children).forEach(c=> c.classList.toggle('selected', c.dataset.value === select.value));
		});
	}

	// 初始化自定义下拉并绑定控件事件
	['categorySelect','prioritySelect','sortSelect','filterCategory','filterPriority'].forEach(id=>{
		const s = document.getElementById(id);
		if (s) createCustomSelect(s);
	});

	// 绑定排序/筛选/刷新事件
	sortSelect.addEventListener('change', renderTasks);
	filterCategory.addEventListener('change', loadTasks);
	filterPriority.addEventListener('change', loadTasks);
	refreshBtn.addEventListener('click', loadTasks);
	clearBtn.addEventListener('click', clearInputs);

	// 初始加载
	loadTasks();
});
