//? |-----------------------------------------------------------------------------------------------|
//? |  /static/js/core.js                                                                           |
//? |                                                                                               |
//? |  Copyright (c) 2018-2021 Belikhun. All right reserved                                         |
//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
//? |-----------------------------------------------------------------------------------------------|

var updateServerHandlers = []

/**
 * Fetch server data and update `SERVER`
 * variable in current window
 */
async function updateServerData() {
	let response = await myajax({ url: "/api/server" });

	document.title = response.data.pageTitle;
	window.SERVER = response.data;
	window.SESSION = response.data.SESSION;
	window.API_TOKEN = SESSION.API_TOKEN;
	updateServerHandlers.forEach((f) => f(window.SERVER));
}

function onUpdateServerData(f) {
	if (typeof f !== "function")
		throw { code: -1, description: `onUpdateServerData(): not a valid function` }

	f(window.SERVER);
	return updateServerHandlers.push(f);
}

const ttn = {
	container: $("#mainContainer"),
	initialized: false,

	/**
	 * Initialize Thi Trắc Nghiệm
	 * @param {Function}	set			Report Progress to Initializer
	 */
	async init(set = () => {}) {
		let start = time();

		await this.initGroup(this, "ttn", ({ p, m, d }) => {
			clog("DEBG", {
				color: oscColor("pink"),
				text: truncateString(m, 34),
				padding: 34,
				separate: true
			}, d);

			set({ p, m, d });
		});
		
		set({ p: 100, m: "ttn", d: "Thi Trắc Nghiệm Core Loaded" });
		this.initialized = true;

		clog("OKAY", {
			color: oscColor("pink"),
			text: "ttn",
			padding: 34,
			separate: true
		}, `Thi Trắc Nghiệm Core Loaded In ${time() - start}s`);
	},

	/**
	 * Initialize A Group Object
	 * @param {Object}		group			The Target Object
	 * @param {String}		name			Group Name
	 * @param {Function}	set				Report Progress to Initializer
	 */
	async initGroup(group, name, set = () => {}) {
		let modulesList = []

		// Search for modules and initialize it
		set({ p: 0, m: name, d: `Scanning Modules Of ${name}` });

		for (let key of Object.keys(group)) {
			if (key === "super")
				continue;

			let item = group[key];
			if (item && !item.initialized && typeof item.init === "function") {
				// Set Up Module Constants
				item.__NAME__ = key;
				item.super = group;

				item.log = (level, ...args) => clog(level, {
					color: oscColor("pink"),
					text: truncateString(`${name}.${item.__NAME__}`, 34),
					padding: 34,
					separate: true
				}, ...args);

				// Push To Queues
				modulesList.push(item);
			}
		}

		if (modulesList.length === 0)
			return;

		// Sort modules by priority
		// The lower the value is, the higher the priority
		set({ p: 5, m: name, d: `Sorting Modules By Priority` });
		modulesList = modulesList.sort((a, b) => (a.priority || 0) - (b.priority || 0));
		
		if (modulesList.length > 0) {
			clog("DEBG", {
				color: oscColor("pink"),
				text: truncateString(name, 34),
				padding: 34,
				separate: true
			}, `Modules of`, {
				text: name,
				color: oscColor("pink")
			}, `(initialize from top to bottom)`);
	
			for (let [i, module] of modulesList.entries())
				clog("DEBG", {
					color: oscColor("pink"),
					text: truncateString(name, 34),
					padding: 34,
					separate: true
				}, " + ", pleft(i, 2), pleft(module.__NAME__, 38), pleft(module.priority || 0, 3));
		}

		// Initialize modules
		for (let i = 0; i < modulesList.length; i++) {
			let moduleStart = time();
			let item = modulesList[i];
			let path = `${name}.${item.__NAME__}`;
			let mP = 5 + (i / modulesList.length) * 95;

			set({ p: mP, m: path, d: `Initializing` });
			try {
				let returnValue = await item.init(({ p, m, d }) => set({
					p: mP + (p * (1 / modulesList.length) * 0.95),
					m: (m) ? `${path}.${m}` : path,
					d
				}), { clog: item.log });

				if (returnValue === false) {
					clog("INFO", {
						color: oscColor("pink"),
						text: truncateString(path, 34),
						padding: 34,
						separate: true
					}, `Module DISABLED! Skipping all Submodules`);

					item.initialized = false;
					continue;
				}

				item.initialized = true;

				// Try to find and initialize submodules
				await this.initGroup(item, path, ({ p, m, d }) => set({ m, d }));
			} catch(error) {
				if (error.code === 12)
					throw error;

				let e = parseException(error);
				throw { code: 12, description: `ttn.initGroup(${path}): ${e.description}`, data: error }
			}

			clog("OKAY", {
				color: oscColor("pink"),
				text: truncateString(path, 34),
				padding: 34,
				separate: true
			}, `Initialized in ${time() - moduleStart}s`);
		}

		delete modulesList;
	},

	sounds: {
		priority: 3,

		__set: () => {},
		__clog: window.clog,
		/** @type	{Function[]} */
		handlers: [],

		async init(set, { clog } = {}) {
			if (typeof set === "function")
				this.__set = set;

			if (typeof clog === "function")
				this.__clog = clog;

			await sounds.init(({ p, m, d, c } = {}) => {
				this.__set({ p, m, d });
				this.handlers.forEach(f => f({ p, m, d, c }));
			}, { clog: this.__clog });
		},

		attach(f) {
			if (typeof f !== "function")
				throw { code: -1, description: `ttn.sounds.attach(): not a valid function` }

			return this.handlers.push(f);
		}
	},

	popup: {
		priority: 1,
		init: () => popup.init()
	},

	https: {
		priority: 0,

		init() {
			if (location.protocol !== "https:") {
				this.log("WARN", "Page is not served through https! Anyone can easily alter your data!");
				return false;
			}

			let upgradeInsecure = document.createElement("meta");
			upgradeInsecure.httpEquiv = "Content-Security-Policy";
			upgradeInsecure.content = "upgrade-insecure-requests";
			document.head.appendChild(upgradeInsecure);
		}
	},

	performance: {
		priority: 1,
		score: null,

		async init(set = () => {}) {
			//! THIS MODULE IS TEMPORARY DISABLED DUE TO NO USE
			//! HOPEFULLY I CAN MAKE USE OF THIS IN THE FUTURE
			return false;

			let oldResult = parseFloat(localStorage.getItem("performance"));

			if (oldResult > 0) {
				this.log("OKAY", "Found Previous Performance Score");
				this.score = oldResult;
			} else {
				set({ p: 0, d: "Running Performance Test" });
				this.log("INFO", "Running Performance Test");

				this.score = await this.runTest();
				localStorage.setItem("performance", this.score);
				set({ p: 0, d: "Performance Test Completed" });
			}

			this.log("OKAY", "Performance Score: ", {
				text: this.score,
				color: oscColor("green")
			});
		},

		runTest() {
			return new Promise((resolve) => {
				let tick = 0;
				let start = performance.now();

				while (tick < 1000)
					tick++;

				resolve(1 / (performance.now() - start));
			});
		}
	},

	updateChecker: {
		priority: 5,

		optInBeta: false,

		async init() {
			if (SESSION.id !== "admin")
				return;

			await this.check();
		},

		async check(set = () => {}) {
			if (!SERVER)
				throw { code: -1, description: `SERVER Data Not Found!` }
			
			let localVersion = `${SERVER.version}-${SERVER.versionTag}`;
			ttn.userSettings.admin.localVersion.content = `Phiên Bản Hiện Tại: <br>${localVersion}</br>`;

			let remoteData = null;
			let remoteVersion = `0.0.0-unknown`;
			ttn.userSettings.admin.remoteVersion.content = `Phiên Bản Mới Nhất: <b>${remoteVersion}</b>`;

			try {
				let response = await myajax({
					url: "https://api.github.com/repos/belivipro9x99/thi-trac-nghiem/releases/latest",
					method: "GET",
					changeState: false,
					reRequest: false
				});
	
				remoteData = response;
			} catch(error) {
				this.log("WARN", "Error Checking for update:", error);
				return;
			}

			remoteVersion = remoteData.tag_name;
			ttn.userSettings.admin.remoteVersion.content = `Phiên Bản Mới Nhất: <b>${remoteVersion}</b>`;
			let state = versionCompare(localVersion, "1.0.1-release", { ignoreTest: this.optInBeta });

			switch (state) {
				case "latest":
					ttn.userSettings.admin.updateNote.set({
						level: "okay",
						message: "Phiên bản hiện tại là phiên bản mới nhất!"
					});

					break;

				case "major":
					ttn.userSettings.admin.updateNote.set({
						level: "warning",
						message: `
							<t>Hiện đã có một bản cập nhật LỚN: <b>${remoteVersion}</b></t>
							<t>Nhấn vào nút dưới đây để đi tới trang tải xuống:</t>
							<a href="${remoteData.html_url}" target="_blank" rel="noopener" class="sq-btn dark" style="margin-top: 10px; width: 100%;">${remoteData.tag_name} : ${remoteData.target_commitish}</a>
						`
					});

					sounds.warning();
					popup.show({
						level: "warning",
						windowTitle: "Update Checker",
						title: "Cập Nhật Hệ Thống",
						message: `Major Update`,
						description: `Hiện đã có một bản cập nhật LỚN! <b>${remoteVersion}</b><br>Vui lòng cập nhật lên phiên bản mới nhất để đảm bảo độ ổn định của hệ thống`,
						buttonList: {
							contact: { text: `${remoteData.tag_name} : ${remoteData.target_commitish}`, color: "dark", resolve: false, onClick: () => window.open(remoteData.html_url, "_blank") },
							continue: { text: "Bỏ qua", color: "pink" }
						}
					});

					break;
			
				case "minor":
					ttn.userSettings.admin.updateNote.set({
						level: "warning",
						message: `
							<t>Hiện đã có một bản cập nhật: <b>${remoteVersion}</b></t>
							<t>Nhấn vào nút dưới đây để đi tới trang tải xuống:</t>
							<a href="${remoteData.html_url}" target="_blank" rel="noopener" class="sq-btn dark" style="margin-top: 10px; width: 100%;">${remoteData.tag_name} : ${remoteData.target_commitish}</a>
						`
					});

					break;

				case "patch":
					ttn.userSettings.admin.updateNote.set({
						level: "info",
						message: `
							<t>Hiện đã có một bản vá lỗi: <b>${remoteVersion}</b></t>
							<t>Nhấn vào nút dưới đây để đi tới trang tải xuống:</t>
							<a href="${remoteData.html_url}" target="_blank" rel="noopener" class="sq-btn dark" style="margin-top: 10px; width: 100%;">${remoteData.tag_name} : ${remoteData.target_commitish}</a>
						`
					});

					break;

				default:
					ttn.userSettings.admin.updateNote.set({
						level: "error",
						message: `Unknown Version: ${state}`
					});

					break;
			}
		}
	},

	rank: {
		priority: 3,
		container: $("#globalRanking"),
		refreshButton: $("#rankingRefresh"),
		heartbeatDot: $("#rankingUpdateHeartbeat"),
		heartbeatAnm: null,

		folding: {},
		timeout: null,
		hash: null,

		enabled: true,
		updateDelay: 2,

		async init() {
			this.refreshButton.addEventListener("click", () => this.update(true));
			new Scrollable(this.container.parentElement, { content: this.container });

			await this.updater();
			this.update();
		},

		beat({ color = "green", beat = true } = {}) {
			if (color && typeof color === "string")
				this.heartbeatDot.dataset.color = color;
			
			if (!this.heartbeatAnm)
				this.heartbeatAnm = this.heartbeatDot.getAnimations()[0];

			if (this.heartbeatAnm && beat)
				this.heartbeatAnm.play();
		},

		async updater() {
			clearTimeout(this.timeout);
			let start = time();

			try {
				if (ttn.initialized && this.enabled)
					await this.update();
			} catch(e) {
				//? IGNORE ERROR
				this.log("ERRR", e);
			}
			
			this.timeout = setTimeout(() => this.updater(), (this.updateDelay - (time() - start)) * 1000);
		},

		async update(hard = false) {
			let response = await myajax({
				url: "/api/problems/rank",
				method: "GET",
			});
	
			let data = response.data;
			let hash = response.hash;

			if (hash === this.hash && !hard) {
				this.beat({ color: "blue" });
				return false;
			}
	
			this.log("DEBG", "Updating Rank", `[${hash}]`);
			this.beat({ color: "green" });
			let timer = new StopClock();
	
			if (data.list.length === 0 && data.rank.length === 0) {
				emptyNode(this.container);
				
				this.hash = hash;
				this.log("DEBG", "Rank Is Empty. Took", {
					color: flatc("blue"),
					text: timer.stop + "s"
				});
	
				return false;
			}
	
			let out = `
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th></th>
							<th>Thí sinh</th>
							<th>Tổng</th>
							<th>TB</th>
			`

			for (let i of data.list)
				out += `
					<th
						class="problem"
						title="${data.nameList[i] || i}"
					>
						${data.nameList[i] || i}
					</th>`;

			out += "</tr></thead><tbody>";
			let ptotal = 0;
			let rank = 0;

			for (let i of data.rank) {
				if (ptotal !== i.total) {
					ptotal = i.total;
					rank++;
				}

				out += `
					<tr data-rank=${rank}>
						<td>${rank}</td>
						<td>
							<div class="lazyload avt">
								<img onload="this.parentNode.dataset.loaded = 1" src="/api/avatar?u=${i.username}"/>
								<div class="simple-spinner"></div>
							</div>
						</td>
						<td>
							<t class="username">${i.username}</t>
							<t class="name">${escapeHTML(i.name || "u:" + i.username)}</t>
						</td>
						<td class="number">${parseFloat(i.total).toFixed(2)}</td>
						<td class="number">${parseFloat(i.total / Object.keys(i.point).length).toFixed(2)}</td>
				`

				for (let j of data.list)
					out += `<td class="number ${i.status[j] || "unknown"}">${(typeof i.point[j] !== "undefined") ? parseFloat(i.point[j]).toFixed(2) : "X"}</td>`;
				
				out += "</tr>";
			}

			out += "</tbody></table>";
			this.container.innerHTML = out;
			this.hash = hash;
	
			this.log("DEBG", "Rank Updated. Took", {
				color: flatc("blue"),
				text: timer.stop + "s"
			});
		},

		foldRankCol(target) {
			let f = (target.dataset.folding === "true");
			let i = target.getAttribute("problem-id");
	
			target.dataset.folding = !f;
			this.folding[i] = !f;

			//* 👀 💥
			let pointList = target
				.parentElement
				.parentElement
				.parentElement
				.querySelectorAll(`tbody > tr > td[problem-id="${i}"]`);
	
			for (let item of pointList)
				item.dataset.folding = !f;
		}
	},

	userSettings: {
		priority: 2,
		container: $("#userSettings"),

		/**
		 * Initialize User Settings Module
		 * @param {Function}	set		Report Progress to Initializer
		 */
		init(set) {
			set({ p: 0, d: "Setting Up User Settings Panel" });
			smenu.init(this.container, {
				title: "cài đặt",
				description: "thay đổi cách Thi Trắc Nghiệm hoạt động"
			});

			smenu.onShow(() => ttn.content.classList.add("parallax"));
			smenu.onHide(() => ttn.content.classList.remove("parallax"));

			if (["beta", "indev", "debug", "test"].includes(SERVER.versionTag)) {
				new smenu.components.Note({
					level: "warning",
					message: `
						Đây là bản thử nghiệm không ổn định dùng để kiểm tra tính ổn định trước khi xuất bản! Vui lòng không tổ chức kì thi nào trên phiên bản này!<br>
						Nếu bạn tìm thấy lỗi, hãy báo cáo lỗi tại link ở phần <b>LIÊN KẾT NGOÀI</b> bên dưới!
					`
				},
					new smenu.Child({ label: "Cảnh Báo" },
						new smenu.Group({
							icon: "exclamation",
							label: "thử nghiệm"
						})
					)
				)
			}
		},

		display: {
			group: smenu.Group.prototype,

			init() {
				this.group = new smenu.Group({ label: "hiển thị", icon: "window" });

				let ux = new smenu.Child({ label: "Giao Diện" }, this.group);
				
				new smenu.components.Checkbox({
					label: "Chế độ ban đêm",
					color: "pink",
					save: "display.nightmode",
					defaultValue: SERVER.clientSettings.nightmode,
					onChange: (v) => ttn.darkmode.set(v)
				}, ux);

				new smenu.components.Checkbox({
					label: "Hoạt ảnh",
					color: "blue",
					save: "display.transition",
					defaultValue: SERVER.clientSettings.transition,
					onChange: (v) => document.body.classList[v ? "remove" : "add"]("disableTransition")
				}, ux);

				let other = new smenu.Child({ label: "Khác" }, this.group);

				new smenu.components.Checkbox({
					label: "Thông báo",
					color: "pink",
					save: "display.notification",
					defaultValue: false,
					disabled: true
				}, other);

				new smenu.components.Checkbox({
					label: "Super Triangles!",
					color: "blue",
					save: "display.triangles",
					defaultValue: (ttn.performance.score > 30),
					disabled: false
				}, other);
			}
		},

		sounds: {
			group: smenu.Group.prototype,

			init() {
				this.group = new smenu.Group({ label: "âm thanh", icon: "volume" });
	
				let status = new smenu.Child({ label: "Trạng Thái" }, this.group);
				let loadDetail = new smenu.components.Text({ content: "Chưa khởi tạo âm thanh" });
				status.insert(loadDetail, -3);

				ttn.sounds.attach(({ c } = {}) => {
					if (typeof c === "string")
						loadDetail.content = c
				});

				let volume = new smenu.components.Slider({
					label: "Âm lượng",
					color: "blue",
					save: "sounds.volume",
					min: 0,
					max: 100,
					unit: "%",
					defaultValue: 60
				});

				status.insert(volume, -1);
				volume.onInput((v) => {
					sounds.volume = (v / 100);
					volume.set({ color: (v >= 80) ? "red" : "blue" })
				});
	
				let cat = new smenu.Child({ label: "Loại" }, this.group);
				let mouseOver = new smenu.components.Checkbox({
					label: "Mouse Over",
					color: "blue",
					save: "sounds.mouseOver",
					defaultValue: true,
					onChange: (v) => sounds.enable.mouseOver = v
				}, cat);
	
				let btnClick = new smenu.components.Checkbox({
					label: "Button Click/Toggle",
					color: "blue",
					save: "sounds.btnClick",
					defaultValue: true,
					onChange: (v) => sounds.enable.btnClick = v
				}, cat);
	
				let panelToggle = new smenu.components.Checkbox({
					label: "Panel Show/Hide",
					color: "blue",
					save: "sounds.panelToggle",
					defaultValue: true,
					onChange: (v) => sounds.enable.panelToggle = v
				}, cat);
	
				let others = new smenu.components.Checkbox({
					label: "Others",
					color: "blue",
					save: "sounds.others",
					defaultValue: true,
					onChange: (v) => sounds.enable.others = v
				}, cat);
	
				let notification = new smenu.components.Checkbox({
					label: "Notification",
					color: "blue",
					save: "sounds.notification",
					defaultValue: true,
					onChange: (v) => sounds.enable.notification = v
				}, cat);
	
				let master = new smenu.components.Checkbox({
					label: "Bật âm thanh",
					color: "pink",
					save: "sounds.master",
					defaultValue: SERVER.clientSettings.sounds,
					onChange: async (v) => {
						sounds.enable.master = v;
						mouseOver.set({ disabled: !v });
						btnClick.set({ disabled: !v });
						panelToggle.set({ disabled: !v });
						others.set({ disabled: !v });
						notification.set({ disabled: !v });

						if (v)
							sounds.soundToggle(sounds.sounds.checkOn);
	
						if (ttn.initialized && !sounds.initialized)
							await ttn.sounds.init();
					}
				});

				status.insert(master, -2);
			}
		},

		clock: {
			group: smenu.Group.prototype,

			init() {
				this.group = new smenu.Group({ label: "thời gian", icon: "clock" });

				let general = new smenu.Child({ label: "Chung" }, this.group);

				new smenu.components.Checkbox({
					label: "Hiện MilliSecond",
					color: "blue",
					save: "clock.showMs",
					defaultValue: SERVER.clientSettings.showMs,
					onChange: (v) => ttn.timer.toggleMs(v)
				}, general);

				new smenu.components.Checkbox({
					label: "Tự động chỉnh giờ chuẩn với máy chủ",
					color: "pink",
					save: "clock.autoCorrect",
					defaultValue: true,
					onChange: async (v) => await ttn.timer.doCorrectTime(v)
				}, general);
			}
		},

		others: {
			group: smenu.Group.prototype,

			init() {
				return false;

				this.group = new smenu.Group({ label: "khác", icon: "circle" });

				let update = new smenu.Child({ label: "Làm Mới" }, this.group);
				let sliderStep = {
					1: 0.5,		2: 1,		3: 2,		4: 10,
					5: 60,		6: 120,		7: 240,		8: 300,
					9: 600,		10: 3600,
					11: false
				}

				let lowWarningSettings = {
					level: "warning",
					windowTitle: "Cảnh Báo",
					title: "Cảnh Báo",
					message: "Thời gian làm mới quá nhỏ!",
					description: "Việc đặt giá trị này quá nhỏ sẽ làm cho máy chủ hiểu nhầm rằng bạn đang tấn công máy chủ và sẽ chặn bạn trong một khoảng thời gian nhất định!",
					buttonList: {
						cancel: { color: "blue", text: "Bấm Lộn! Trả Về Cũ Đi!" },
						ignore: { color: "red", text: "Máy Chủ Là Gì? Có Ăn Được Không?" }
					}
				}

				let updateRank = new smenu.components.Slider({
					label: "Thời gian cập nhật xếp hạng",
					color: "blue",
					save: "others.updateRank",
					min: 1,
					max: 11,
					unit: "giây",
					defaultValue: SERVER.clientSettings.rankUpdate,
					valueStep: sliderStep
				}, update);

				updateRank.onInput((v) => updateRank.set({ color: (v <= 2) ? "red" : "blue" }));
				updateRank.onChange(async (v, e) => {
					if (v < 3 && e.isTrusted)
						if (await popup.show(lowWarningSettings) === "cancel") {
							updateRank.set({ value: 3 });
							return;
						}

					if (sliderStep[v] === false)
						ttn.rank.enabled = false;
					else {
						ttn.rank.enabled = true;
						ttn.rank.updateDelay = sliderStep[v];
					}
				});

				let updateLogs = new smenu.components.Slider({
					label: "Thời gian cập nhật nhật kí",
					color: "blue",
					save: "others.logsUpdate",
					min: 1,
					max: 11,
					unit: "giây",
					defaultValue: SERVER.clientSettings.logsUpdate,
					valueStep: sliderStep
				}, update);

				updateLogs.onInput((v) => updateLogs.set({ color: (v <= 2) ? "red" : "blue" }));
				updateLogs.onChange(async (v, e) => {
					if (v < 3 && e.isTrusted)
						if (await popup.show(lowWarningSettings) === "cancel") {
							updateLogs.set({ value: 3 });
							return;
						}

					if (v === 11)
						if (await popup.show({
							level: "warning",
							windowTitle: "Cảnh Báo",
							title: "Cảnh Báo",
							message: "Tắt tự động cập nhật nhật ký",
							description: "Việc này sẽ làm cho tình trạng nộp bài của bạn không được tự động cập nhật.<br>Bạn có chắc muốn tắt tính năng này không?",
							buttonList: {
								cancel: { color: "blue", text: "Bấm Lộn! Trả Về Cũ Đi!" },
								ignore: { color: "red", text: "TẮT! TẮT HẾT!" }
							}
						}) === "cancel") {
							updateLogs.set({ value: 3 });
							return;
						}

					if (sliderStep[v] === false)
						ttn.logs.enabled = false;
					else {
						ttn.logs.enabled = true;
						ttn.logs.updateDelay = sliderStep[v];
					}
				});

				let updateHash = new smenu.components.Slider({
					label: "Thời gian cập nhật dữ liệu và cài đặt",
					color: "blue",
					save: "others.hashUpdate",
					min: 1,
					max: 11,
					unit: "giây",
					defaultValue: SERVER.clientSettings.hashUpdate,
					valueStep: sliderStep
				}, update);

				updateHash.onInput((v) => updateHash.set({ color: (v <= 2) ? "red" : "blue" }));
				updateHash.onChange(async (v, e) => {
					if (v < 3 && e.isTrusted)
						if (await popup.show(lowWarningSettings) === "cancel") {
							updateHash.set({ value: 3 });
							return;
						}

					if (v === 11)
						if (await popup.show({
							level: "warning",
							windowTitle: "Cảnh Báo",
							title: "Cảnh Báo",
							message: "Tắt tự động cập nhật dữ liệu và cài đặt",
							description: "Việc này sẽ tắt tự động cập nhật thông báo, thời gian, danh sách đề bài, ...<br>Bạn có chắc muốn tắt tính năng này không?",
							buttonList: {
								cancel: { color: "blue", text: "Bấm Lộn 😅 Trả Về Cũ Đi!" },
								ignore: { color: "red", text: "TẮT! TẮT HẾT!" }
							}
						}) === "cancel") {
							updateHash.set({ value: 3 });
							return;
						}

					if (sliderStep[v] === false)
						ttn.hash.enabled = false;
					else {
						ttn.hash.enabled = true;
						ttn.hash.updateDelay = sliderStep[v];
					}
				});
			}
		},

		admin: {
			group: smenu.Group.prototype,

			async init() {
				if (SESSION.id !== "admin") {
					this.log("INFO", "Current Session Does Not Have Admin Privileges. Admin Features Will Not Be ENABLED!");
					return false;
				}

				this.group = new smenu.Group({ icon: "userCog", label: "quản trị" });

				this.update();
				this.settings();
				this.data();
			},

			localVersion: smenu.components.Text.prototype,
			remoteVersion: smenu.components.Text.prototype,
			updateNote: smenu.components.Note.prototype,

			update() {
				let child = new smenu.Child({ label: "Phiên Bản" }, this.group);

				this.localVersion = new smenu.components.Text({
					content: "Phiên Bản Hiện Tại: <b>UPDATING</b>"
				}, child);

				this.remoteVersion = new smenu.components.Text({
					content: "Phiên Bản Mới Nhất: <b>UPDATING</b>"
				}, child);

				this.updateNote = new smenu.components.Note({
					level: "info",
					message: "Đang Kiểm Tra Phiên Bản Mới"
				}, child);

				new smenu.components.Space(child);

				new smenu.components.Checkbox({
					label: "Thông báo khi có bản thử nghiệm mới",
					color: "blue",
					save: "optInBeta",
					defaultValue: false,
					onChange: (v) => ttn.updateChecker.optInBeta = v
				}, child);

				new smenu.components.Button({
					label: "Kiểm Tra Phiên Bản Mới",
					color: "yellow",
					icon: "upload",
					complex: true,
					onClick: async () => await ttn.updateChecker.check()
				}, child);
			},

			settingsChild: smenu.Child.prototype,
			controlPanel: smenu.Panel.prototype,
			accountsPanel: smenu.Panel.prototype,

			settings() {
				this.settingsChild = new smenu.Child({ label: "Cài Đặt" }, this.group);

				let controlPanelButton = new smenu.components.Button({
					label: "Admin Control Panel",
					color: "blue",
					icon: "arrowLeft",
					complex: true
				}, this.settingsChild);

				this.controlPanel = new smenu.Panel(undefined, { size: "large" });
				this.controlPanel.setToggler(controlPanelButton);
				this.controlPanel.content("iframe:/config.php");
				ttn.darkmode.onToggle((enabled) => this.controlPanel.iframe.contentDocument.body.classList[enabled ? "add" : "remove"]("dark"));

				let accountsButton = new smenu.components.Button({
					label: "Quản Lí Tài Khoản",
					color: "blue",
					icon: "arrowLeft",
					complex: true
				}, this.settingsChild);

				this.accountsPanel = new smenu.Panel(undefined, { size: "large" });
				this.accountsPanel.setToggler(accountsButton);
				this.accountsPanel.content("iframe:/account.php");
				ttn.darkmode.onToggle((enabled) => this.accountsPanel.iframe.contentDocument.body.classList[enabled ? "add" : "remove"]("dark"));
			},

			dataChild: smenu.Child.prototype,

			data() {
				this.dataChild = new smenu.Child({ label: "Dữ Liệu" }, this.group);

				new smenu.components.Button({
					label: "Xóa Cache",
					color: "red",
					icon: "trash",
					complex: true,
					onClick: async () => {
						try {
							await myajax({
								url: "/api/delete",
								method: "POST",
								form: {
									type: "cache",
									token: API_TOKEN
								}
							});
						} catch(e) {
							errorHandler(e);
							return;
						}
					}
				}, this.dataChild);

				new smenu.components.Button({
					label: "Xóa Toàn Bộ Dữ Liệu Bài Làm",
					color: "red",
					icon: "trash",
					complex: true,
					onClick: async () => {
						if (await popup.show({
							level: "warning",
							windowTitle: "Xác Nhận",
							title: "Xóa Dữ Liệu Bài Làm",
							message: "Xác Nhận",
							description: "Bạn có chắc muốn xóa toàn bộ dữ liệu bài làm không? Những dữ liệu này bao gồm kết quả chấm, code và nhật ký chấm của toàn bộ tài khoản.",
							note: "Hành động này <b>không thể hoàn tác</b> một khi đã thực hiện!",
							noteLevel: "warning",
							buttonList: {
								proceed: { color: "red", text: "XÓA" },
								cancel: { color: "blue", text: "Hủy Bỏ" }
							}
						}) !== "proceed")
							return;

						try {
							let response = await myajax({
								url: "/api/contest/delete",
								method: "POST",
								form: {
									type: "submission",
									token: API_TOKEN
								}
							});

							await popup.show({
								level: "okay",
								windowTitle: "Thành Công",
								title: "Xóa Dữ Liệu Bài Làm",
								message: "Thành Công",
								description: `Đã xóa tổng cộng ${response.data.amount} tệp`,
								buttonList: {
									close: { color: "blue", text: "OK" }
								}
							})
						} catch(e) {
							errorHandler(e);
							return;
						}
					}
				}, this.dataChild);
			},

			syslogs: {
				panel: smenu.Panel.prototype,
				container: HTMLElement.prototype,
				logsContainer: HTMLElement.prototype,

				nav: {
					left: HTMLElement.prototype,
					btnLeft: HTMLElement.prototype,
					currentPage: HTMLElement.prototype,
					btnRight: HTMLElement.prototype,
					right: HTMLElement.prototype
				},

				prevHash: undefined,
				showPerPage: 20,
				currentPage: 1,
				maxPage: 1,
	
				async init() {
					this.panel = new smenu.Panel($("#syslogs"), { size: "large" });
					this.panel.setToggler(new smenu.components.Button({
						label: "Nhật Kí Hệ Thống",
						color: "blue",
						icon: "arrowLeft",
						complex: true
					}, this.super.settingsChild));

					this.panel.custom.type("delete");
					this.panel.custom.onClick(() => this.refresh(true));

					this.container = this.panel.container;
					this.logsContainer = fcfn(this.container, "logsContainer");
					this.nav.left = fcfn(this.container, "left");
					this.nav.btnLeft = fcfn(this.container, "buttonLeft");
					this.nav.currentPage = fcfn(this.container, "currentPage");
					this.nav.btnRight = fcfn(this.container, "buttonRight");
					this.nav.right = fcfn(this.container, "right");
	
					await this.refresh();
					ttn.hash.onUpdate("syslogs", () => this.refresh());
	
					this.nav.btnLeft.addEventListener("click", e => {
						this.currentPage--;
	
						if (this.currentPage < 1)
							this.currentPage = 1;
	
						this.refresh();
					});
	
					this.nav.btnRight.addEventListener("click", e => {
						this.currentPage++;
	
						if (this.currentPage > this.maxPage)
							this.currentPage = this.maxPage;
	
						this.refresh();
					});
				},
	
				async refresh(clearLogs = false) {
					let response = {}
	
					try {
						response = await myajax({
							url: "/api/logs",
							method: "POST",
							form: {
								token: API_TOKEN,
								clear: clearLogs,
								show: this.showPerPage,
								page: this.currentPage
							}
						})
					} catch(e) {
						if (e.data.code === 6) {
							this.log("WARN", `Không tồn tại trang ${this.currentPage} của nhật ký hệ thống`, e.data.data);
							this.currentPage = 1;
							this.maxPage = e.data.data.maxPage;
							await this.refresh();
	
							return;
						}
	
						errorHandler(e);
						return;
					}
	
					let data = response.data;
					let hash = response.hash;
					if (hash === this.prevHash)
						return;
	
					this.prevHash = hash;
					this.nav.left.innerText = `Hiển thị ${data.from} - ${data.to}`;
					this.nav.currentPage.innerText = `Trang ${data.pageNth}/${data.maxPage}`;
					this.nav.right.innerText = `Tổng ${data.total}`;
					this.maxPage = data.maxPage;
					var html = [];
	
					for (let i of data.logs)
						html.push(`
							<div class="log ${i.level.toLowerCase()}" onclick="this.classList.toggle('enlarge')">
								<span class="level">${i.level}<i>#${i.nth}</i></span>
								<span class="detail">
									<div class="text">${i.text}</div>
									<div class="info">
										<t class="client">${i.client.username}@${i.client.ip}</t>
										<t class="timestamp">${i.time}</t>
										<t class="module">${i.module}</t>
									</div>
								</span>
							</div>
						`);
					
					this.logsContainer.innerHTML = html.join("\n");
					this.log("info", `Refreshed SysLogs [${hash}]`);
				}
			}
		},

		projectInfo: {
			group: smenu.Group.prototype,
			licensePanel: smenu.Panel.prototype,

			async init() {
				this.group = new smenu.Group({ label: "thông tin", icon: "info" });
				let links = new smenu.Child({ label: "Liên Kết Ngoài" }, this.group);

				new smenu.components.Button({
					label: "Báo Lỗi",
					color: "pink",
					icon: "externalLink",
					complex: true,
					onClick: () => window.open(SERVER.REPORT_ERROR, "_blank")
				}, links);
				
				new smenu.components.Button({
					label: "Wiki",
					color: "pink",
					icon: "externalLink",
					complex: true,
					onClick: () => window.open(SERVER.REPO_ADDRESS + "/wiki", "_blank")
				}, links);
				
				new smenu.components.Button({
					label: "Mã Nguồn Mở",
					color: "pink",
					icon: "externalLink",
					complex: true,
					onClick: () => window.open(SERVER.REPO_ADDRESS, "_blank")
				}, links);

				let project = new smenu.Child({ label: "Dự Án" }, this.group);

				let detailsButton = new smenu.components.Button({
					label: "Thông Tin",
					color: "blue",
					icon: "arrowLeft",
					complex: true
				}, project);

				(new smenu.Panel($("#mainFooter"))).setToggler(detailsButton);

				let licenseButton = new smenu.components.Button({
					label: "LICENSE",
					color: "blue",
					icon: "arrowLeft",
					complex: true
				}, project);

				this.licensePanel = new smenu.Panel(undefined, { size: "large" });
				this.licensePanel.setToggler(licenseButton);
				await this.licensePanel.content("iframe:/licenseInfo.php");
				ttn.darkmode.onToggle((enabled) => this.licensePanel.iframe.contentDocument.body.classList[enabled ? "add" : "remove"]("dark"));

				new smenu.components.Footer({
					icon: "/assets/img/icon.webp",
					appName: SERVER.APPNAME,
					version: SERVER.version
				}, project);
			}
		}
	},

	darkmode: {
		priority: 4,
		enabled: false,
		toggleHandlers: [],

		init() {
			this.update();
		},

		set(dark) {
			this.enabled = dark;

			if (this.initialized)
				this.update();
		},

		onToggle(f) {
			if (!f || typeof f !== "function")
				throw { code: -1, description: `ttn.Panel().button(${icon}).onClick(): not a valid function` }

			this.toggleHandlers.push(f);
			f(this.enabled);
		},

		update() {
			this.toggleHandlers.forEach(f => f(this.enabled));
			document.body.classList[this.enabled ? "add" : "remove"]("dark");
		}
	},

	wavec: {
		priority: 1,
		container: $("#waveContainer"),

		init(set) {
			set({ p: 0, d: "Setting Up Wave Container" });
			wavec.init(this.container);
		}
	},

	navbar: {
		priority: 1,

		container: $("#navbar"),

		/**
		 * Title component
		 * 
		 * Page title and description
		 * 
		 * @var navbar.title
		 */
		title: navbar.title({
			tooltip: {
				title: "contest",
				description: "xem thông tin kì thi này"
			}
		}),

		/**
		 * Hamburger icon
		 * 
		 * User Settings Panel Toggler
		 * 
		 * @var navbar.menuButton
		 */
		menu: navbar.menuButton({
			tooltip: {
				title: "settings",
				description: "thay đổi cài đặt của Thi Trắc Nghiệm"
			}
		}),

		/**
		 * Initialize Navigation Bar Module
		 * @param {Function}	set		Report Progress to Initializer
		 */
		init(set) {
			set({ p: 0, d: "Setting Up Navigation Bar" });
			navbar.init(this.container);

			set({ p: 20, d: "Adding Default Navigation Bar Modules" });
			this.menu.click.setHandler((active) => (active) ? smenu.show() : smenu.hide());
			smenu.onShow(() => this.menu.click.setActive(true));
			smenu.onHide(() => this.menu.click.setActive(false));

			navbar.insert(this.title, "left");
			navbar.insert(this.menu, "right");
		},

		switch: {
			component: navbar.switch(),
			home: null,
			ranking: null,

			init() {
				navbar.insert(this.component, "left");
				ttn.darkmode.onToggle((dark) => this.component.set({ color: dark ? "dark" : "whitesmoke" }));

				this.home = this.component.button({
					icon: "home",
					tooltip: {
						title: "home",
						description: "xem đề bài và nộp bài làm!"
					}
				});

				this.home.click.setHandler((a) => (a) ? ttn.container.dataset.layout = 1 : "");

				this.ranking = this.component.button({
					icon: "table",
					tooltip: {
						title: "ranking",
						description: "xem những người khác thực hiện tốt như thế nào!"
					}
				});

				this.ranking.click.setHandler((a) => (a) ? ttn.container.dataset.layout = 2 : "");

				if (SESSION && SESSION.username)
					this.home.click.active = true;
				else
					this.ranking.click.active = true;
			}
		},

		announcement: {
			component: navbar.announcement(),
			currentHash: null,

			init() {
				navbar.insert(this.component, "left");
				this.component.onRead(() => localStorage.setItem("config.announcement", this.currentHash));
				ttn.hash.onUpdate("config.announcement", (h) => this.update(h));
			},

			async update(hash) {
				let lastReadHash = localStorage.getItem("config.announcement");

				if (lastReadHash === hash) {
					this.log("DEBG", `Announcement Read`);
					return;
				}

				let response = await myajax({
					url: `/api/announcement`,
					method: "GET"
				});

				if (!response.data.enabled) {
					this.log("INFO", `Announcement Disabled`);
					this.component.hide();
					return;
				}

				sounds.notification();
				this.currentHash = hash;
				this.component.set({
					level: response.data.level,
					message: response.data.message,
					time: time()
				});
			}
		},

		account: {
			component: null,
			username: null,

			async init() {
				this.username = SESSION.username;

				if (!this.username) {
					this.component = navbar.account({
						color: "darkRed",
						tooltip: {
							title: "account",
							description: "nhấn để đăng nhập!"
						}
					});

					this.component.click.setHandler(() => window.location ="/login.php");
					navbar.insert(this.component, "right");
					return;
				}

				let accountData = await myajax({
					url: "/api/info",
					query: {
						u: SESSION.username
					}
				});

				this.component = navbar.account({
					id: accountData.data.id,
					username: SESSION.username,
					name: accountData.data.name,
					avatar: `/api/avatar?u=${this.username}`,
					tooltip: {
						title: "account",
						description: "chỉnh sửa hoặc đăng xuất khỏi tài khoản hiện tại!"
					}
				});

				this.component.onChangeAvatar(async (file) => {
					try {
						await myajax({
							url: "/api/avatar",
							method: "POST",
							form: {
								token: API_TOKEN,
								file
							}
						});
					} catch(e) {
						sounds.warning();
						errorHandler(e);
						throw e;
					}

					this.log("OKAY", "Avatar changed");
				});

				this.component.onChangeName(async (name) => {
					let response = null;

					try {
						response = await myajax({
							url: "/api/edit",
							method: "POST",
							form: {
								name,
								token: API_TOKEN
							}
						})
					} catch(e) {
						this.log("ERRR", e);

						await popup.show({
							windowTitle: "Đổi Tên",
							title: "Thất Bại",
							message: "Đổi tên không thành công",
							description: `[${e.data.code}] ${e.data.description}`,
							level: "info",
							buttonList: {
								close: { text: "Đóng" }
							}
						});

						return false;
					}

					this.component.set({ name: response.data.name });
					this.log("OKAY", `Changed Name To`, {
						text: name,
						color: oscColor("pink")
					})
				});

				this.component.onChangePassword(async (password, newPassword) => {
					let response = null;

					try {
						response = await myajax({
							url: "/api/edit",
							method: "POST",
							form: {
								password,
								newPassword,
								token: API_TOKEN
							}
						})
					} catch(e) {
						this.log("ERRR", e);

						await popup.show({
							windowTitle: "Đổi Mật Khẩu",
							title: "Thất Bại",
							message: "Đổi mật khẩu không thành công",
							description: `[${e.data.code}] ${e.data.description}`,
							level: "info",
							buttonList: {
								close: { text: "Đóng" }
							}
						});

						return false;
					}

					popup.show({
						windowTitle: "Đổi Mật Khẩu",
						title: "Thành Công",
						description: `Mật khẩu của bạn đã được đổi`,
						level: "okay",
						buttonList: {
							close: { text: "Đóng" }
						}
					});

					this.log("OKAY", `Password Changed`);
				});

				this.component.onLogout(async () => {
					let response = await myajax({
						url: "/api/logout",
						method: "POST",
						form: {
							token: API_TOKEN
						}
					});

					window.location = response.data.redirect;
				});

				ttn.darkmode.onToggle((e) => this.component.set({ color: e ? "darkBlue" : "blue" }));
				navbar.insert(this.component, "right");
			}
		}
	},

	contestInfo: {
		priority: 3,

		/** @type {HTMLElement} */
		container: null,
		
		wavec: wavec.Container.prototype,

		init() {
			this.container = makeTree("div", "contestInfo", {
				header: { tag: "div", class: "header", child: {
					landing: new lazyload({ source: "/api/images/landing", classes: "landing" }),
					icon: new lazyload({ source: "/api/images/icon", classes: "icon" }),
					cTitle: { tag: "t", class: "title", text: SERVER.contest.name }
				}},

				description: { tag: "div", class: "description", child: {
					dummy: { tag: "span" }	
				}}
			});

			// Update title and description if
			// changed on the server
			ttn.hash.onUpdate("config.contest.basicInfo", async () => {
				await updateServerData();
				this.update();
			});

			this.wavec = new wavec.Container(this.container, {
				icon: "book",
				title: "thông tin kì thi"
			});

			this.update();
			ttn.navbar.title.click.setHandler((active) => (active) ? this.wavec.show() : this.wavec.hide());
			this.wavec.onToggle((value) => ttn.navbar.title.click.setActive(value));
			this.wavec.onReload(() => this.reload());
		},

		update() {
			this.wavec.loading = true;
			this.container.header.landing.src = "/api/images/landing";
			this.container.header.icon.src = "/api/images/icon";
			this.container.header.cTitle.innerText = SERVER.contest.name;
			this.container.description.replaceChild(md2html.parse(SERVER.contest.description), this.container.description.firstChild);
			this.wavec.loading = false;

			ttn.navbar.title.set({
				icon: "/api/images/icon",
				title: SERVER.contest.name,
			});
		}
	},

	publicFile: {
		priority: 3,

		/** @type {HTMLIFrameElement} */
		container: null,
		
		wavec: wavec.Container.prototype,
		loaded: false,

		button: navbar.iconButton({
			icon: "upload",
			tooltip: {
				title: "public",
				description: `danh sách các tệp công khai`
			}
		}),

		init() {
			this.container = document.createElement("iframe");
			this.container.classList.add("fullIframe");
			this.container.src = "/public";

			this.wavec = new wavec.Container(this.container, {
				icon: "upload",
				title: "các tệp công khai"
			});

			this.button.click.setHandler((active) => {
				if (!this.loaded)
					this.load();

				active ? this.wavec.show() : this.wavec.hide();
			});

			ttn.darkmode.onToggle((dark) => this.button.set({ color: dark ? "dark" : "whitesmoke" }));
			this.wavec.onToggle((value) => this.button.click.setActive(value));
			this.wavec.onReload(() => this.reload());

			navbar.insert(this.button, "right");
		},

		load() {
			this.container.src = "/public";
			this.loaded = true;
		},

		reload() {
			this.container.contenttnndow.location.reload();
		}
	},

	tooltip: {
		priority: 4,

		init(set) {
			set({ p: 0, d: `Initializing Tooltip` });
			tooltip.init();
		}
	},

	hash: {
		priority: 6,
		changeHandlers: {},
		hashes: {},

		timeout: null,

		enabled: true,
		updateDelay: 2,

		async init(set = () => {}) {
			await this.update(set = () => {});
			await this.updater();
		},

		async updater() {
			clearTimeout(this.timeout);
			let start = time();

			try {
				if (ttn.initialized && this.enabled)
					await this.update();
			} catch(e) {
				//? IGNORE ERROR
				this.log("ERRR", e);
			}
			
			this.timeout = setTimeout(() => this.updater(), (this.updateDelay - (time() - start)) * 1000);
		},

		async update(set = () => {}) {
			set({ p: 0, d: "Receiving Hash List" });
			let response = await myajax({
				url: `/api/hash`,
				method: "GET"
			});

			let keys = Object.keys(response.data);
			for (let [i, key] of keys.entries()) {
				set({ p: 10 + ((i + 1) / keys.length) * 0.9, d: `Processing ${key}` });

				if (this.hashes[key] !== response.data[key]) {
					let hash = response.data[key];
					let doUpdate = (typeof this.hashes[key] === "string");
					
					this.log("INFO", "Hash Changed:",
						{ text: hash, color: oscColor("green") },
						{ text: key, color: oscColor("blue") }
					);

					this.hashes[key] = hash;

					if (doUpdate) {
						if (!this.changeHandlers[key] || this.changeHandlers[key].length === 0) {
							this.log("DEBG", `No handlers for ${key}. Skipping`);
							continue;
						}
	
						for (let f of this.changeHandlers[key])
							await f(hash);
					} else
						this.log("DEBG", "Hash Initialized:", { text: key, color: oscColor("blue") });
				}
			}
		},

		onUpdate(key, f) {
			if (typeof key !== "string")
				throw { code: -1, description: `ttn.hash.onUpdate(${key}): key is not a valid string` }

			if (typeof f !== "function")
				throw { code: -1, description: `ttn.hash.onUpdate(${key}): not a valid function` }

			if (!this.changeHandlers[key])
				this.changeHandlers[key] = new Array();

			return this.changeHandlers[key].push(f);
		}
	},

	/**
	 * ========= BEGIN USELESS CODE 😁 =========
	 */
	deliveringMeme: false,

	async getRandomMeme() {
		if (this.deliveringMeme)
			return;

		this.deliveringMeme = true;
		let wutMeme = await myajax({
			url: "https://meme-api.herokuapp.com/gimme",
			method: "GET"
		})

		let memeContainer = document.createElement("div");
		memeContainer.classList.add("lazyload", "image");
		memeContainer.style.overflow = "auto";
		memeContainer.innerHTML = `
			<img src="${wutMeme.url}" onload="this.parentElement.dataset.loaded = 1;"/>
			<div class="simpleSpinner"></div>
		`;

		let gud = await popup.show({
			windowTitle: "MEME REVIEW 👏👏",
			title: "got some mweme fow yya",
			message: `r/${wutMeme.subreddit} u/${wutMeme.author} (${wutMeme.ups} 🔼) <a href="${wutMeme.postLink}" target="_blank">SAUCE 🔗</a>`,
			description: wutMeme.title,
			customNode: memeContainer,
			buttonList: {
				moar: { text: "👏 NEXT 👏 MEME 👏", color: "rainbow" },
				stahp: { text: "THIS MEME IS ALREADY DEAD", color: "dark" }
			}
		})

		this.deliveringMeme = false;

		if (gud === "moar")
			this.getRandomMeme();
	}
}