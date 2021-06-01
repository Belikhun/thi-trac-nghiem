//? |-----------------------------------------------------------------------------------------------|
//? |  /static/js/ttn.js                                                                           |
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
	window.LOGGED_IN = !!window.SESSION.username;
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
								<div class="simpleSpinner"></div>
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

	contest: {
		priority: 3,
        showMs: false,
		
		doCorrectTime: true,
		delta: 0,

        init() {
        },

        Time: class {
            constructor(data = { begin: time(), during: 0, offset: 0 }) {
                this.updateInterval = 1000;
                this.updateTimeout = null;
                this.paused = false;
                this.last = 0;
                this.ms = false;

                this.upCommingHandler = null;
                this.inProgressHandler = null;
                this.inOffsetHandler = null;
                this.completedHandler = null;
                this.upCommingHandled = false;
                this.inProgressHandled = false;
                this.inOffsetHandled = false;
                this.completedHandled = false;

                this.timeUpdateHandler = async () => {}

                // START
                this.data = data;
                this.updateHandler();
            }

            set update(t) {
                this.updateInterval = t;
            }

            set showMs(show) {
                if (show) {
                    this.ms = true;
                    this.updateInterval = 60;
                } else {
                    this.ms = false;
                    this.updateInterval = 1000;
                }
            }

            set onUpComming(f = () => {}) {
                this.upCommingHandler = f;
            }

            set onInProgress(f = () => {}) {
                this.inProgressHandler = f;
            }

            set onInOffset(f = () => {}) {
                this.inOffsetHandler = f;
            }

            set onCompleted(f = () => {}) {
                this.completedHandler = f;
            }

            set onTimeUpdate(f = () => {}) {
                this.timeUpdateHandler = f;
            }

            set data(data) {
                if (!typeof data === "object")
                    throw { code: -1, description: `ttn.contest.Time().data: data is not type of object, instead got ${typeof data}` }

                this.timeData = data;
                this.last = 0;
                this.upCommingHandled = false;
                this.inProgressHandled = false;
                this.inOffsetHandled = false;
                this.completedHandled = false;
                this.__update();
            }

            phaseHandler(phase) {
                if (phase === 1 && !this.upCommingHandled && typeof this.upCommingHandler === "function") {
                    this.upCommingHandler();
                    this.upCommingHandled = true;
                    this.inProgressHandled = false;
                    this.inOffsetHandled = false;
                    this.completedHandled = false;
                } else if (phase === 2 && !this.inProgressHandled && typeof this.inProgressHandler === "function") {
                    this.inProgressHandler();
                    this.upCommingHandled = false;
                    this.inProgressHandled = true;
                    this.inOffsetHandled = false;
                    this.completedHandled = false;
                } else if (phase === 3 && !this.inOffsetHandled && typeof this.inOffsetHandler === "function") {
                    this.inOffsetHandler();
                    this.upCommingHandled = false;
                    this.inProgressHandled = false;
                    this.inOffsetHandled = true;
                    this.completedHandled = false;
                } else if (phase === 4 && !this.completedHandled && typeof this.completedHandler === "function") {
                    this.completedHandler();
                    this.upCommingHandled = false;
                    this.inProgressHandled = false;
                    this.inOffsetHandled = false;
                    this.completedHandled = true;
                }
            }

            async updateHandler() {
                clearTimeout(this.updateTimeout);

                if (this.paused)
                    return;

                let timer = new StopClock();
                
                try {
                    await this.__update();
                } catch(e) {
                    //? IGNORE ERROR
                    clog("ERRR", e);
                }
                
                this.updateTimeout = setTimeout(() => this.updateHandler(), this.updateInterval - (timer.stop * 1000));
            }

            pause(pause = true) {
                if (pause) {
                    this.paused = true;
                    clearTimeout(this.updateTimeout);
                } else {
                    this.paused = false;
                    this.updateHandler();
                }
            }

            destroy() {
                clearTimeout(this.updateTimeout);

                delete this.updateInterval
                delete this.updateTimeout
                delete this.paused
                delete this.last
                delete this.ms

                delete this.upCommingHandler
                delete this.inProgressHandler
                delete this.inOffsetHandler
                delete this.completedHandler
                delete this.upCommingHandled
                delete this.inProgressHandled
                delete this.inOffsetHandled
                delete this.completedHandled

                delete this.timeUpdateHandler

                delete this.data
            }

			__getTime() {
				if (ttn.contest.doCorrectTime)
					return (time() + ttn.contest.delta)
				else
					return time();
			}

            async __update() {
                let beginTime = this.timeData.begin;
                let duringTime = this.timeData.during;
                let offsetTime = this.timeData.offset;
                let t = beginTime - this.__getTime() + duringTime;
    
                let phase = 0;
                let progress = 0;
                let end = 0;
    
                if (t > duringTime) {
                    t -= duringTime;
                    if (this.last === 0)
                        this.last = t;

                    phase = 1;
                    progress = ((t) / this.last) * 100;
                    end = this.last;
                } else if (t > 0) {
                    phase = 2;
                    progress = (t / duringTime) * 100;
                    end = duringTime;
                } else if (t > -offsetTime) {
                    t += offsetTime;
                    
                    phase = 3;
                    progress = (t / offsetTime) * 100;
                    end = offsetTime;
                } else {
                    t += offsetTime;
    
                    phase = 4;
                    progress = 100;
                }
    
                let days = Math.floor(t / 86400) + (t < 0 ? 1 : 0);
                let timeParsed = parseTime(t % 86400, { showPlus: true, forceShowHours: true });
                
                this.phaseHandler(phase);
                await this.timeUpdateHandler({
                    phase,
                    begin: beginTime,
                    during: duringTime,
                    offset: offsetTime,
                    end,
                    progress,
                    days,
                    time: timeParsed,
                    showMs: this.ms
                });
            }
        },

        list: {
            container: $("#problemsListContainer"),
            upComming: $("#problemListUpComming"),
            inProgress: $("#problemListInProgress"),
            completed: $("#problemListCompleted"),
			buttons: $("#problemListButtons"),
			
            reload: undefined,
            optimize: false,
            runningList: [],

            async init() {
				this.reload = createButton("LÀM MỚI", {
					style: "round",
					icon: "reload"
				});

				this.buttons.appendChild(this.reload);
                await this.fetchList();
                this.reload.addEventListener("mouseup", () => this.fetchList());
            },

            destroyAll() {
                for (let item of this.runningList)
                    item.destroy();
            },

            async fetchList() {
                this.reload.disabled = true;

                this.destroyAll();
                emptyNode(this.upComming);
                emptyNode(this.inProgress);
                emptyNode(this.completed);

                let data = (await myajax({
                    url: `/api/problems/list`,
                    method: "GET"
                })).data

                for (let item of data)
                    this.createItem(item);

                this.reload.disabled = false;
            },

            createItem(data) {
                clog("DEBG", data);
                let time = new ttn.contest.Time(data.time);

                var item = buildElementTree("span", "item", [
                    {
                        type: "div",
                        class: ["lazyload", "thumbnail"],
                        name: "thumbnailContainer",
                        list: [
                            { type: "img", name: "thumbnail" },
                            { type: "div", class: "simpleSpinner", name: "spinner" }
                        ]
                    },
                    {
                        type: "div",
                        class: "detail",
                        name: "detail",
                        list: [
                            {
                                type: "span",
                                class: "left",
                                name: "left",
                                list: [
                                    { type: "t", class: "title", name: "problemName", text: data.name },
                                    { type: "t", class: "duration", name: "duration", text: `${Math.round(data.time.during / 60)} phút` },
                                    { type: "t", class: "date", name: "date", text: (new Date(data.time.begin * 1000)).toLocaleString() }
                                ]
                            },
                            {
                                type: "span",
                                class: "right",
                                name: "right",
                                list: [
                                    { type: "t", class: "detail", name: "detail", text: `Đang lấy thông tin` },
                                    { type: "timer", name: "timer" }
                                ]
                            }
                        ]
                    }
                ]);

                item.obj.dataset.id = data.id;
                item.obj.addEventListener("mouseup", (e) => ttn.contest.problem.open(data.id));
                item.obj.thumbnailContainer.thumbnail.addEventListener("load", () => item.obj.thumbnailContainer.dataset.loaded = 1);
                item.obj.thumbnailContainer.thumbnail.src = data.thumbnail;

                time.timeUpdateHandler = (data) => {
                    if (this.optimize)
                        return;

                    item.tree.dataset.soundhover = 1;
                    sounds.applySound(item.tree);
                    time.showMs = (data.phase === 2 || data.phase === 3) && ttn.contest.showMs;
                    item.obj.detail.right.detail.innerText = ["Bắt đầu sau", "Đang thi", "Sắp kết thúc", "Đã kết thúc"][data.phase - 1]
                    item.obj.detail.right.timer.dataset.color = ["blue", "green", "yellow", "red"][data.phase - 1]
                    item.obj.detail.right.timer.innerHTML = `<days>${data.days}</days>${data.time.str}${data.showMs ? `<ms>${data.time.ms}</ms>` : ""}`;
                }

                time.onUpComming = () => this.upComming.appendChild(item.tree);
                time.onInOffset = time.onInProgress = () => this.inProgress.appendChild(item.tree);
                time.onCompleted = () => this.completed.appendChild(item.tree);

                this.runningList.push(time);
            }
        },

        problem: {
            timer: {
				container: $("#timer"),
                time: null,
                name: $("#problemName"),
                timer: $("#problemTimer"),
                timerDetail: $("#problemTimerDetail"),
                bar: $("#problemProgressBar"),
                info: $("#problemProgressInfo")
            },

			footer: $("#problemFooter"),
            quitBtn: $("#problemQuit"),
            submitBtn: $("#problemSubmit"),

            mainBox: $("#problemMainBox"),
            sheet: $("#problemSheet"),
            ranking: $("#problemRanking"),

            boardToggler: $("#problemBoardToggler"),
            rankingToggler: $("#problemRankingToggler"),

            markBox: $("#problemMarkBox"),
            attachmentWrapper: $("#problemAttachmentWrapper"),
            attachmentLink: $("#problemAttachmentLink"),
            attachment: $("#problemAttachment"),

            zoom: {
                container: $("#problemZoom"),
                in: $("#problemZoomIn"),
                out: $("#problemZoomOut")
            },

            result: {
                correct: $("#problemResultCorrect"),
                wrong: $("#problemResultWrong"),
                skipped: $("#problemResultSkipped"),
                point: $("#problemResultPoint"),
            },

            data: {},
            showing: false,
			id: null,
            previousRankHash: null,

            async init() {
                this.timer.time = new ttn.contest.Time();
                
                this.timer.time.timeUpdateHandler = (data) => {
                    this.timer.timer.innerHTML = `<days>${data.days}</days>${data.time.str}${data.showMs ? `<ms>${data.time.ms}</ms>` : ""}`;
                    this.timer.timerDetail.innerText = ["Bắt đầu sau", "Thời gian làm bài", "Thời gian nộp bài", "Bài thi đã kết thúc"][data.phase - 1]
                    this.timer.bar.style.width = `${data.progress}%`;
                    this.timer.bar.dataset.blink = ["none", "none", "grow", "fade"][data.phase - 1];
                    this.timer.bar.dataset.blinkFast = data.progress < 20 ? true : false;
                    this.timer.bar.dataset.color = this.timer.timer.dataset.color = ["blue", "green", "yellow", "red"][data.phase - 1]
                    this.timer.bar.classList[data.showMs ? "add" : "remove"]("noTransition");
                    this.timer.info.innerText = `${parseTime(data.end).str}`;
                }

				new Scrollable(this.sheet, {
					content: this.markBox,
					horizontal: true
				});

                this.boardToggler.addEventListener("mouseup", () => this.changePanel(1));
                this.rankingToggler.addEventListener("mouseup", () => this.changePanel(2));
                this.quitBtn.addEventListener("mouseup", () => this.toggle(false));

                this.markBox.addEventListener("click", () => {
                    if (!this.data || this.data.judged === true)
                        return;

                    let data = this.getCheckedList();
                    clog("DEBG", "Saving", this.data.id, { data });
                    localStorage.setItem(`problem.${this.data.id}`, data.join(";"));
                });

                this.submitBtn.addEventListener("mouseup", async () => {
                    let data = this.getCheckedList();

                    if (await this.submit(data)) {
                        await this.loadData(this.data.id);
                        this.renderMarkBox(this.data.question, { readonly: true, data });
                    }
                });

                this.changePanel(1);
                this.toggle(false);
            },

            changePanel(panel = 1) {
                if (this.mainBox.dataset.layout == panel)
                    return;
    
                switch (panel) {
                    case 1:
                        emptyNode(this.ranking);

                        this.boardToggler.classList.add("active");
                        this.rankingToggler.classList.remove("active");
                        sounds.toggle(1);
                        break;
                
                    case 2:
                        this.boardToggler.classList.remove("active");
                        this.rankingToggler.classList.add("active");
                        sounds.toggle(0);

                        setTimeout(() => this.fetchRank(true), 400);
                        break;
        
                    default:
                        return;
                }
        
                this.mainBox.dataset.layout = panel;
            },

            async fetchRank(bypass = false) {
                let response = {}
                
                try {
                    response = await myajax({
                        url: "/api/problems/rank",
                        method: "GET",
                        query: { id: this.data.id }
                    });
                } catch(e) {
                    errorHandler(e);
                    throw e;
                }
        
                let data = response.data;

                if (response.code === 105)
                    this.ranking.classList.add("contestNotEnded");
                else
                    this.ranking.classList.remove("contestNotEnded");

                let hash = response.hash;
                if (hash === this.previousRankHash && !bypass)
                    return false;
        
                clog("debg", "Updating Rank", `[${hash}]`);
                let updateRankTimer = new StopClock();
        
                if (data.list.length === 0 && data.rank.length === 0) {
                    emptyNode(this.ranking);
        
                    this.previousRankHash = hash;
                    clog("debg", "Rank Is Empty. Took", {
                        color: flatc("blue"),
                        text: updateRankTimer.stop + "s"
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
                    if (ptotal !== i.point) {
                        ptotal = i.point;
                        rank++;
                    }
        
                    out += `
                        <tr data-rank=${rank}>
                            <td>${rank}</td>
                            <td>
                                <div class="lazyload avt">
                                    <img onload="this.parentNode.dataset.loaded = 1" src="/api/avatar?u=${i.username}"/>
                                    <div class="simpleSpinner"></div>
                                </div>
                            </td>
                            <td>
                                <t class="username">${i.username}</t>
                                <t class="name">${escapeHTML(i.name || "u:" + i.username)}</t>
                            </td>
                            <td class="number">${parseFloat(i.point).toFixed(2)}</td>
                    `
        
                    for (let j of data.list)
                        out += `<td class="number ${i.detail[j].status || "unknown"}">${(i.detail[j].answer && i.detail[j].answer !== "") ? i.detail[j].answer : "X"}</td>`;
                    
                    out += "</tr>";
                }
        
                out += "</tbody></table>";
                this.ranking.innerHTML = out;
                this.previousRankHash = hash;
        
                clog("debg", "Rank Updated. Took", {
                    color: flatc("blue"),
                    text: updateRankTimer.stop + "s"
                });
            },

            optimize(optimize = true) {
                this.timer.time.pause(optimize);
            },

            toggle(show = true) {
                if (show) {
                    this.showing = true;
                    this.submitBtn.disabled = false;
                    emptyNode(this.markBox);
                    this.sheet.classList.remove("showResult")
                    this.sheet.removeAttribute("data-empty");
                    this.attachmentWrapper.dataset.display = false;
                    this.attachmentLink.style.display = "none";

                    // OPTIMIZE
                    ttn.contest.list.optimize = true;
                    this.timer.time.showMs = ttn.contest.showMs;
                    this.optimize(false);

                    sounds.toggle(0);
					this.timer.container.classList.add("show");
                    ttn.contest.list.container.classList.add("hide");
                } else {
                    this.showing = false;
					this.id = null;
                    ttn.contest.list.optimize = false;
                    this.timer.time.showMs = false;
                    this.optimize(true);
                    delete this.data;
                    this.data = null;
                    
                    this.attachmentWrapper.removeChild(this.attachment);
                    let clone = this.attachment.cloneNode();
                    clone.src = "";
                    this.attachmentWrapper.insertBefore(clone, this.attachmentWrapper.childNodes[0]);
                    this.attachment = clone;
                    
                    sounds.toggle(1);
                    ttn.contest.list.container.classList.remove("hide");
					this.timer.container.classList.remove("show");
                    this.attachmentWrapper.removeAttribute("data-loaded");
                }
            },

            async loadData(id) {
                try {
                    response = await myajax({
                        url: "/api/problems/get",
                        method: "GET",
                        query: { id }
                    });
                } catch(e) {
                    errorHandler(e);
                    this.toggle(false);
                    return false;
                }

                this.data = response.data;
                return true;
            },

            async open(id) {
                this.toggle(true);

                if (!(await this.loadData(id)))
                    return;

				this.id = id;
                this.timer.time.onUpComming = () => {
                    if (this.data.result) {
                        this.printResult(this.data.result);
                        this.loadAttachment(this.data);
                    } else {
                        this.submitBtn.disabled = true;
                        this.sheet.dataset.empty = (LOGGED_IN) ? "upcomming" : "guest";
                    }
                }

                this.timer.time.onInProgress = () => {
                    this.sheet.removeAttribute("data-empty");
                    this.loadAttachment(this.data);

                    if (!LOGGED_IN) {
                        this.sheet.dataset.empty = "guest";
                        this.submitBtn.disabled = true;
                        return;
                    }

                    if (this.data.result)
                        this.printResult(this.data.result);
                    else if (this.data.submit.length > 0) {
                        this.renderMarkBox(this.data.question, { data: this.data.submit, readonly: true });
                        this.submitBtn.disabled = true;
                    } else {
                        let lastStorage = localStorage.getItem(`problem.${this.data.id}`);
                        lastStorage = (lastStorage) ? lastStorage.split(";") : [];
                        this.renderMarkBox(this.data.question, { data: lastStorage, readonly: this.data.judged });
                        this.submitBtn.disabled = this.data.judged;
                    }
                }

                this.timer.time.onInOffset = async () => {
                    this.sheet.removeAttribute("data-empty");
                    this.loadAttachment(this.data);

                    if (!LOGGED_IN) {
                        this.sheet.dataset.empty = "guest";
                        this.submitBtn.disabled = true;
                        return;
                    }

                    if (this.data.result)
                        this.printResult(this.data.result);
                    else if (this.data.submit.length > 0) {
                        this.renderMarkBox(this.data.question, { data: this.data.submit, readonly: true });
                        this.submitBtn.disabled = true;
                    } else {
                        let checked = this.getCheckedList();
                        let lastStorage = localStorage.getItem(`problem.${this.data.id}`);
                        let data = (checked.length > 0) ? checked : ((lastStorage) ? lastStorage.split(";") : []);

                        if (!this.data.judged)
                            await this.submit(data, false);

                        this.submitBtn.disabled = this.data.judged;
                        this.renderMarkBox(this.data.question, { readonly: true, data });
                    }
                }

                this.timer.time.onCompleted = async () => {
                    if (!(await this.loadData(id)))
                        return;

                    this.loadAttachment(this.data);
                    this.submitBtn.disabled = true;

                    if (this.data.result)
                        this.printResult(this.data.result);
                    else {
                        emptyNode(this.markBox);
                        this.sheet.dataset.empty = (LOGGED_IN) ? "noresult" : "guest";
                    }
                }

                this.timer.name.innerText = this.data.name;
                this.timer.time.data = this.data.time;
            },

            async loadAttachment(data) {
				if (!this.data)
					return;

                await waitFor(async () => {
                    let response = {}

                    try {
                        response = await myajax({
                            url: "/api/problems/timer",
                            method: "GET",
                            query: { id: this.data.id }
                        })
                    } catch(e) {
                        errorHandler(e);
                        return false;
                    }
                    
                    return (response.data.phase >= 2)
                }, () => clog("OKAY", "Server in expected phase"), 20, 500);

                this.zoom.container.style.display = "none";
                this.attachmentWrapper.removeAttribute("data-loaded");

                if (data.attachment.url) {
                    this.attachmentLink.href = data.attachment.url;
                    this.attachmentLink.innerText = `${data.attachment.file} (${convertSize(data.attachment.size)})`;
                    this.attachmentLink.style.display = "block";

                    let isImage = ["png", "jpg", "svg"].includes(data.attachment.extension);
                    let isHTML = data.attachment.extension === "html";
                    this.attachmentWrapper.dataset.display = true;
                    this.attachmentWrapper.dataset.type = isImage ? "image" : "document";

                    if (data.attachment.embed) {
                        this.attachmentWrapper.removeChild(this.attachment);
    
                        setTimeout(() => {
                            let newNode = document.createElement(isImage ? "img" : (isHTML) ? "iframe" : "embed");
                            newNode.id = "problemAttachment";

                            newNode.style.display = "block";
                            newNode.addEventListener("load", () => {
                                this.attachmentWrapper.dataset.loaded = 1;

                                if (isHTML) {
                                    newNode.contentDocument.body.style.zoom = newNode.clientWidth / 620;
                                    this.zoom.container.style.display = "block";

                                    this.zoom.in.onclick = () => newNode.contentDocument.body.style.zoom = parseFloat(newNode.contentDocument.body.style.zoom) + 0.5;
                                    this.zoom.out.onclick = () => newNode.contentDocument.body.style.zoom = parseFloat(newNode.contentDocument.body.style.zoom) - 0.5;

                                    let injectCSS = document.createElement("style");
                                    injectCSS.type = "text/css";
                                    injectCSS.appendChild(document.createTextNode(`
                                        #page-container,
                                        #sidebar {
                                            background-color: transparent;
                                            background-image: unset;
                                        }

                                        .pf {
                                            box-shadow: unset;
                                        }
                                    `));

                                    newNode.contentDocument.head.appendChild(injectCSS);
                                }
                            })

                            newNode.addEventListener("error", () => this.attachmentWrapper.dataset.loaded = "errored");
                            newNode.src = `${data.attachment.url}&embed=true#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0&page=1&view=FitH`;

                            this.attachmentWrapper.insertBefore(newNode, this.attachmentWrapper.childNodes[0]);
                            this.attachment = newNode;
                        }, 1500);
                    } else {
                        this.attachmentWrapper.dataset.display = false;
                        this.attachmentLink.style.display = "none";
                    }
                } else {
                    this.attachmentWrapper.dataset.display = false;
                    this.attachmentLink.style.display = "none";
                }
            },

            renderMarkBox(count = 40, {
                answer = ["A", "B", "C", "D"],
                readonly = false,
                data = []
            } = {}) {
                emptyNode(this.markBox);
                let html = "";

                for (let i = 1; i <= count; i++) {
                    let input = "";

                    for (let item of answer)
                        input += `
                            <label for="problemQuestion_${i}${item}" class="circleCheckbox">
                                <input
                                    id="problemQuestion_${i}${item}"
                                    name="problemQuestion${i}"
                                    type="radio" value="${item}"
                                    ${(typeof data[i-1] === "string" && data[i-1] === item) ? "checked" : ""}
                                    ${readonly ? "disabled" : ""}
                                    class="sound" data-soundcheck
                                >
                                <div class="checkmark">${item}</div>
                            </label>
                        `

                    html += `
                        <span class="input sound" data-soundhoversoft data-question="${i}">
                            <t class="label">Câu ${i}</t>
                            ${input}
                        </span>
                    `
                }

                this.markBox.innerHTML = html;
                sounds.scan();
            },

            getCheckedList() {
                let inputList = this.markBox.querySelectorAll("span.input[data-question]");
                let list = []

                for (let item of inputList) {
                    let i = Math.floor(item.dataset.question) - 1;
                    let c = item.querySelector("input:checked");
                    
                    list[i] = (c) ? c.value : "";
                }

                return list;
            },

            async submit(data, prompt = true) {
                this.submitBtn.disabled = true;
                let response = {}

                if (prompt) {
                    let note = document.createElement("div");
                    note.classList.add("note", "warning");
                    note.innerHTML = `<span class="inner">Bạn sẽ <b>không thể sửa lại bài</b> một khi đã nộp bài!</span>`;

                    let res = await popup.show({
                        windowTitle: "Nộp Bài",
                        title: "Xác nhận nộp bài",
                        message: this.data.name,
                        description: `Bạn có chắc muốn nộp bài trước không?`,
                        additionalNode: note,
                        level: "warning",
                        buttonList: {
                            okay: { text: "OK", color: "blue" },
                            cancel: { text: "HỦY", color: "red" },
                        }
                    });

                    if (res !== "okay") {
                        this.submitBtn.disabled = false;
                        return false;
                    }
                }

                try {
                    response = await myajax({
                        url: "/api/problems/submit",
                        method: "POST",
                        form: {
                            id: this.data.id,
                            data: JSON.stringify(data),
                            token: API_TOKEN
                        }
                    })
                } catch(e) {
                    errorHandler(e);
                    return false;
                }

                this.data.judged = true;

                popup.show({
                    windowTitle: "Nộp Bài",
                    title: "Nộp bài thành công",
                    message: (prompt) ? "Nộp trước " + formatTime((this.data.time.begin + this.data.time.during) - response.data.time) : "Vừa xong",
                    description: `Đã nộp bài <b>${this.data.name}</b> lên máy chủ!<br>Bạn có thể xem kết quả chấm sau khi hết giờ kiểm tra.`,
                    level: "okay",
                    buttonList: {
                        okay: { text: "OK", color: "rainbow" }
                    }
                });

                return true;
            },

            printResult(data) {
                this.submitBtn.disabled = true;
                this.result.correct.innerText = `${data.correct}/${data.total}`;
                this.result.wrong.innerText = data.wrong;
                this.result.skipped.innerText = data.skipped;
                this.result.point.innerText = data.point;
                this.renderMarkBox(data.total, { readonly: true });
                setTimeout(() => {
                    this.sheet.classList.add("showResult");

                    for (let i = 0; i < data.detail.length; i++) {
                        let item = data.detail[i];
    
                        let c = this.markBox.querySelector(`span.input[data-question="${i + 1}"]`);
                        let r = null;
                        let a = null;
                        
                        if (c)
                            switch (item.status) {
                                case "correct":
                                    c.dataset.status = "correct";
                                    r = c.querySelector(`#problemQuestion_${i+1}${item.result}`);
                                    r.checked = true;
                                    r.parentElement.dataset.color = "green";
                                    break;
    
                                case "wrong":
                                    c.dataset.status = "wrong";
                                    r = c.querySelector(`#problemQuestion_${i+1}${item.result}`);
                                    r.checked = true;
                                    r.parentElement.dataset.color = "blue";
                                    a = c.querySelector(`#problemQuestion_${i+1}${item.answer}`);
                                    a.parentElement.dataset.color = "red";
                                    a.parentElement.dataset.force = true;
                                    break;
    
                                case "skipped":
                                    c.dataset.status = "skipped";
                                    r = c.querySelector(`#problemQuestion_${i+1}${item.result}`);
                                    r.checked = true;
                                    r.parentElement.dataset.color = "yellow";
                                    break;
    
                                default:
                                    clog("WARN", "ttn.contest.problem.printResult(): unknwon item status:", item.status);
                                    continue;
                            }
                    }
                }, 600);
            }
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

			smenu.onShow(() => ttn.container.classList.add("parallax"));
			smenu.onHide(() => ttn.container.classList.remove("parallax"));

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
					onChange: (v) => ttn.contest.showMs = v
				}, general);

				new smenu.components.Checkbox({
					label: "Tự động chỉnh giờ chuẩn với máy chủ",
					color: "pink",
					save: "clock.autoCorrect",
					defaultValue: true,
					onChange: async (v) => ttn.contest.doCorrectTime = v
				}, general);
			}
		},

		others: {
			group: smenu.Group.prototype,

			init() {
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
			},

			problemEditor: {
				/** @type {HTMLElement} */
				container: null,
				
				id: null,
				action: null,
				updateTimeout: null,
				addButton: null,
				editButton: null,
				deleteButton: null,
				languages: {},
				
				/** @type {wavec.Container} */
				wavec: wavec.Container.prototype,

				async init() {
					this.container = makeTree("form", "problemEditor", {
						header: { tag: "div", class: "header", child: {
							left: { tag: "span", class: "left", child: {
								main: { tag: "t", class: "main", html: `<icon data-icon="pencil"></icon>thông tin` }
							}},

							right: { tag: "span", class: "right", child: {
								delete: createButton("Xóa", {
									color: "red",
									classes: "delete",
									style: "round",
									icon: "trash",
									complex: true
								}),

								cancel: createButton("Hủy", {
									color: "yellow",
									classes: "cancel",
									style: "round",
									icon: "close",
									complex: true
								}),

								submit: createButton("LƯU", {
									color: "blue",
									type: "submit",
									classes: "submit",
									style: "round",
									icon: "save",
									complex: true
								})
							}}
						}},

						main: { tag: "div", class: "main", child: {
							thumbnail: createImageInput({
								id: "problemEditorThumbnail",
								src: "/api/problems/thumbnail",
								resetText: "Xóa Ảnh Hiện Tại"
							}),
							
							top: { tag: "div", class: "row", child: {
								left: { tag: "span", class: "column", child: {
									pID: createInput({
										label: "Mã Đề Bài",
										type: "text",
										id: "problemEditorID",
										required: true
									}),

									pTitle: createInput({
										label: "Tên Đề Bài",
										type: "text",
										id: "problemEditorTitle",
										required: true
									}),

									point: createInput({
										type: "number",
										label: "Điểm",
										id: "problemEditorPoint",
										required: true
									}),

									datetime: { tag: "div", class: "row", child: {
										date: createInput({
											type: "date",
											label: "Ngày Bắt Đầu",
											id: "problemEditorBeginDate",
											required: true
										}),

										time: createInput({
											type: "time",
											label: "Giờ Bắt Đầu",
											id: "problemEditorBeginTime",
											required: true
										}),

										setNow: createButton("HIỆN TẠI", {
											color: "brown",
											style: "round",
											icon: "clock"
										})
									}},

									during: createInput({
										type: "number",
										label: "Thời Gian Làm Bài",
										id: "problemEditorDuring",
										required: true
									}),

									offset: createInput({
										type: "number",
										label: "Thời Gian Bù Giờ",
										id: "problemEditorOffset",
										required: true
									}),

									attachment: createInput({
										type: "file",
										label: "Tệp Tài Liệu",
										id: "problemEditorAttachment",
										required: false
									}),

									removeAttachment: createButton("Xóa Tệp Tài Liệu Hiện Tại", {
										color: "pink",
										icon: "trash",
										complex: true
									})
								}},

								right: { tag: "span", class: "column", child: {
									test: { tag: "div", class: "test", child: {
										label: { tag: "t", class: "label", text: "Đáp Án" },
										list: { tag: "div", class: "list" },
										add: createButton("THÊM", {
											icon: "plus",
											classes: "add",
											complex: true
										})
									}}
								}}
							}}
						}}
					});

					this.wavec = new wavec.Container(this.container);
					this.container.addEventListener("submit", () => {});
					this.container.action = "javascript:void(0);";
					this.container.dataset.active = "main";
					this.container.addEventListener("submit", () => this.postSubmit());
					this.container.main.top.left.datetime.time.input.step = 1;
					this.container.main.top.right.test.add.addEventListener("click", () => this.addTest());
					this.container.header.right.cancel.addEventListener("click", () => this.wavec.hide());
					this.container.header.right.delete.addEventListener("click", () => this.delete(this.id));

					this.container.main.thumbnail.onReset(async () => {
						if (this.id && await this.deleteFile("thumbnail", this.id))
							this.container.main.thumbnail.clear();
					});

					this.container.main.top.left.datetime.setNow.addEventListener("click", () => {
						setDateTimeValue(
							this.container.main.top.left.datetime.date.input,
							this.container.main.top.left.datetime.time.input
						);
					});

					// Inject Button Into Problem Viewer
					this.addButton = createButton("Tạo Đề Bài", {
						color: "pink",
						style: "round",
						icon: "plus"
					});

					this.editButton = createButton("Chỉnh Sửa", {
						color: "green",
						icon: "pencil",
						complex: true
					});

					this.deleteButton = createButton("Xóa", {
						color: "red",
						icon: "trash",
						complex: true
					});

					ttn.contest.problem.footer.append(this.editButton, this.deleteButton);
					ttn.contest.list.buttons.appendChild(this.addButton);
					this.addButton.addEventListener("click", () => this.create());
					this.editButton.addEventListener("click", () => this.edit(ttn.contest.problem.id));
					this.deleteButton.addEventListener("click", () => this.delete(ttn.contest.problem.id));
				},

				async resetForm() {
					this.container.main.top.left.pID.input.value = "";
					this.container.main.top.left.pID.input.disabled = false;
					this.container.main.top.left.pTitle.input.value = "";
					this.container.main.top.left.point.input.value = "";

					setDateTimeValue(
						this.container.main.top.left.datetime.date.input,
						this.container.main.top.left.datetime.time.input
					);

					this.container.main.top.left.during.input.value = "";
					this.container.main.top.left.offset.input.value = "";
					this.container.main.top.left.attachment.input.value = null;

					this.container.main.thumbnail.clear();
					emptyNode(this.container.main.top.right.test.list);
					this.container.header.right.delete.style.display = "none";
					this.action = null;
				},

				addTest(value = "") {
					let randName = randString(8);
                    let answer = ["A", "B", "C", "D"];
                    let input = "";

                    for (let mark of answer) {
                        let randID = randString(8);

                        input += `
                            <label for="problemEdit_${randID}" class="circleCheckbox">
                                <input
                                    id="problemEdit_${randID}"
                                    name="problemEdit_${randName}"
                                    type="radio" value="${mark}"
									required
									${(value.toUpperCase() === mark ? `checked=true` : "")}
                                >
                                <div class="checkmark">${mark}</div>
                            </label>
                        `
                    }

                    html = `
                        <div class="cell">
                            ${input}
                            <span class="delete" onClick="this.parentElement.remove()"></span>
                        </div>
                    `

					this.container.main.top.right.test.list.appendChild(htmlToElement(html));
				},

				getTest() {
					let testNodes = this.container.main.top.right.test.list.querySelectorAll("div.cell");
					let test = []
	
					for (let item of testNodes) {
						let input = item.querySelector("label > input:checked");

						if (!input)
							throw { code: -1, description: `Cannot find checked input in test list` }

						test.push(input.value);
					}

					return test;
				},

				async create() {
					this.wavec.set({ title: "đề bài - Tạo Mới" });
					this.wavec.show();
					this.wavec.loading = true;

					await this.resetForm();
					this.container.main.top.left.attachment.input.disabled = false;
					this.container.main.top.left.removeAttachment.disabled = true;
					this.action = "add";

					this.wavec.loading = false;
					setTimeout(() => this.container.main.top.left.pID.input.focus(), 600);
				},

				async edit(id) {
					this.wavec.show();
					this.wavec.loading = true;
					this.wavec.set({ title: `đề bài - ${id}` });

					let response = await myajax({
						url: "/api/problems/get",
						method: "GET",
						query: {
							id: id
						}
					});
	
					let data = response.data;
					this.log("INFO", "Editing problem", {
						color: flatc("yellow"),
						text: id
					}, data);

					this.id = data.id;
	
					await this.resetForm();
					this.container.header.right.delete.style.display = null;
					this.container.main.top.left.pID.input.value = data.id;
					this.container.main.top.left.pID.input.disabled = true;
					this.container.main.top.left.pTitle.input.value = data.name;
					this.container.main.top.left.point.input.value = data.point;

					setDateTimeValue(
						this.container.main.top.left.datetime.date.input,
						this.container.main.top.left.datetime.time.input,
						data.time.begin
					);

					this.container.main.top.left.during.input.value = data.time.during;
					this.container.main.top.left.offset.input.value = data.time.offset;
					this.container.main.thumbnail.src(`/api/problems/thumbnail?id=${data.id}`);

					if (data.attachment && data.attachment.file) {
						this.container.main.top.left.removeAttachment.disabled = false;

						this.container.main.top.left.removeAttachment.onclick = async () => {
							this.container.main.top.left.removeAttachment.disabled = true;

							if (!await this.deleteFile("attachment", data.id, data.attachment.file))
								this.container.main.top.left.removeAttachment.disabled = false;
						}
					} else
						this.container.main.top.left.removeAttachment.disabled = true;

					for (let item of data.answer)
						this.addTest(item);

					this.action = "edit";
					this.wavec.loading = false;
				},

				async postSubmit() {
					this.wavec.loading = true;
	
					let data = {
						id: this.container.main.top.left.pID.input.value,
						name: this.container.main.top.left.pTitle.input.value,
						point: parseFloat(this.container.main.top.left.point.input.value),
						
						time: {
							begin: getDateTimeValue(
								this.container.main.top.left.datetime.date.input,
								this.container.main.top.left.datetime.time.input
							),

							during: parseInt(this.container.main.top.left.during.input.value),
							offset: parseInt(this.container.main.top.left.offset.input.value)
						},

						results: this.getTest()
					}
	
					let thumbnail = this.container.main.thumbnail.input.files[0] || null;
					let attachment =  this.container.main.top.left.attachment.input.files[0] || null;
					
					await this.submit(this.action, data, thumbnail, attachment);

					await ttn.contest.list.fetchList();
					if (ttn.contest.problem.id)
						ttn.contest.problem.open(ttn.contest.problem.id);

					this.wavec.loading = false;
					this.wavec.hide();
				},
	
				async submit(action, data, thumbnail = null, attachment = null) {
					if (!["edit", "add"].includes(action))
						throw { code: -1, description: `ttn.userSettings.admin.problemEditor.submit(${action}): not a valid action!` }
	
					this.log("INFO", "Problem Submit:", {
						color: flatc("green"),
						text: action
					}, {
						color: flatc("yellow"),
						text: data.id
					});
	
					try {
						await myajax({
							url: "/api/problems/" + action,
							method: "POST",
							form: {
								data: JSON.stringify(data),
								thumbnail,
								attachment,
								token: API_TOKEN
							}
						});
					} catch(e) {
						errorHandler(e);
						throw e;
					}

					return true;
				},

				async delete(id) {
					this.log("WARN", "Deleting Problem", {
						color: flatc("yellow"),
						text: id + "."
					}, "Waiting for confirmation");
	
					let confirm = await popup.show({
						level: "warning",
						windowTitle: "Problems Editor",
						title: `Xóa \"${id}\"`,
						message: `Xác nhận`,
						description: `Bạn có chắc muốn xóa đề bài <i>${id}</i> không?`,
						note: `Hành động này <b>không thể hoàn tác</b> một khi đã thực hiện!`,
						noteLevel: "warning",
						buttonList: {
							delete: { text: "XÓA!!!", color: "red" },
							cancel: { text: "Hủy Bỏ", color: "blue" }
						}
					})
	
					if (confirm !== "delete") {
						this.log("INFO", "Cancelled deletion of", {
							color: flatc("yellow"),
							text: id + "."
						});

						return;
					}
	
					sounds.confirm(1);
	
					try {
						await myajax({
							url: "/api/problems/remove",
							method: "POST",
							form: {
								id: id,
								token: API_TOKEN
							}
						});
					} catch(e) {
						errorHandler(e);
						throw e;
					}
	
					this.log("OKAY", "Deleted Problem", {
						color: flatc("yellow"),
						text: id
					});
	
					this.wavec.hide();
				},

				async deleteFile(type, id, fileName = null) {
					if (!["thumbnail", "attachment"].includes(type))
						throw { code: -1, description: `ttn.userSettings.admin.problemEditor.deleteFile(${type}): not a valid type!` }
	
					typeName = { thumbnail: "Ảnh Nền", attachment: "Tệp Đính Kèm" }[type]
	
					this.log("WARN", "Preparing to delete", typeName, "of", {
						color: flatc("yellow"),
						text: `${id}.`
					}, "Waiting for confirmation...");
	
					let action = await popup.show({
						windowTitle: "Xác nhận",
						title: `Xóa ${typeName} của đề "${id}"`,
						description: `Bạn có chắc muốn xóa ${fileName ? `<b>${fileName}</b>` : "không"}?`,
						note: `Hành động này <b>không thể hoàn tác</b> một khi đã thực hiện!`,
						level: "warning",
						buttonList: {
							delete: { color: "pink", text: "XÓA!!!" },
							cancel: { color: "blue", text: "Hủy" }
						}
					})
	
					if (action !== "delete") {
						this.log("INFO", "Cancelled deletion", typeName, "of", {
							color: flatc("yellow"),
							text: id
						})
	
						return false;
					}
	
					try {
						await myajax({
							url: `/api/problems/${type}`,
							method: "DELETE",
							header: {
								id: id,
								token: API_TOKEN
							}
						})
					} catch(e) {
						errorHandler(e);
						throw e;
					}
	
					this.log("OKAY", "Deleted", typeName, "of", {
						color: flatc("yellow"),
						text: id
					})
	
					return true;
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