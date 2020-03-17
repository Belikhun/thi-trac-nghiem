//? |-----------------------------------------------------------------------------------------------|
//? |  /assets/js/core.js                                                                           |
//? |                                                                                               |
//? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
//? |-----------------------------------------------------------------------------------------------|

const core = {
    container: $("#mainContainer"),
    navBar: $("#navBar"),
    problemToggler: $("#showProblemPanel"),
    rankingToggler: $("#showRankingPanel"),
    rankPanel: $("#globalRanking"),
    previousRankHash: null,
    initialized: false,

	async init(set) {
        clog("info", "Initializing...");
        var initTime = new stopClock();

        set(0, "Initializing: popup");
        popup.init();

        set(10, "Getting Server Config");
        await this.getServerConfigAsync();

        set(20, "Loading Problems List");
        await this.contest.init();
        
        set(30, "Initializing: core.userSettings");
        this.userSettings.init(LOGGED_IN);

        set(35, "Initializing: sounds");
        await sounds.init((p, t) => {
            set(35 + p*0.5, `Initializing: sounds (${t})`);
        });

        set(90, "Applying Event Handler");
        this.problemToggler.addEventListener("mouseup", () => this.changePanel(1));
        this.rankingToggler.addEventListener("mouseup", () => this.changePanel(2));
        this.changePanel(1);
        
        if (LOGGED_IN) {
            if (IS_ADMIN) {
                clog("info", "Logged in as Admin.");

                set(95, "Initializing: core.settings");
                await this.settings.init();
            }
        } else
            clog("warn", "You are not logged in. Some feature will be disabled.");

        clog("debg", "Initialisation took:", {
            color: flatc("blue"),
            text: initTime.stop + "s"
        })

        set(100, "Initialized");
        clog("okay", "core.js Initialized.");
        this.initialized = true;

        if (location.protocol === "http:")
            $("#unsecureProtocolWarning").style.display = "flex";

        console.log("%cSTOP!", "font-size: 72px; font-weight: 900;");
        console.log(
            "%cThis feature is intended for developers. Pasting something here could give strangers access to your account.",
            "font-size: 18px; font-weight: 700;"
        );
	},

	async getServerConfigAsync() {
        const response = await myajax({
            url: "/api/server",
            method: "GET",
        }).catch(e => {
            clog("WARN", "Error while getting server status:", {
                text: e.data.description,
                color: flatc("red"),
            });
        });

        window.SERVER = response.data;
    },

    changePanel(panel) {
        if (this.container.dataset.layout == panel)
            return;

        switch (panel) {
            case 1:
                this.problemToggler.classList.add("active");
                this.rankingToggler.classList.remove("active");
                break;
        
            case 2:
                this.problemToggler.classList.remove("active");
                this.rankingToggler.classList.add("active");
                this.fetchRank(true);
                break;

            default:
                return;
        }

        this.container.dataset.layout = panel;
    },

    async fetchRank(bypass = false) {
        let response = await myajax({
            url: "/api/problems/rank",
            method: "GET",
        });

        let data = response.data;
        let hash = response.hash;
        if (hash === this.previousRankHash && !bypass)
            return false;

        clog("debg", "Updating Rank", `[${hash}]`);
        let updateRankTimer = new stopClock();

        if (data.list.length === 0 && data.rank.length === 0) {
            emptyNode(this.rankPanel);

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
                        <th>Tổng</th>
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
            `

            for (let j of data.list)
                out += `<td class="number ${i.status[j] || "unknown"}">${(typeof i.point[j] !== "undefined") ? parseFloat(i.point[j]).toFixed(2) : "X"}</td>`;
            
            out += "</tr>";
        }

        out += "</tbody></table>";
        this.rankPanel.innerHTML = out;
        this.previousRankHash = hash;

        clog("debg", "Rank Updated. Took", {
            color: flatc("blue"),
            text: updateRankTimer.stop + "s"
        });
    },

    contest: {
        showMs: false,

        async init() {
            await this.list.init();
            await this.problem.init();

            clog("okay", "Initialised:", {
                color: flatc("red"),
                text: "core.contest"
            });
        },

        time: class {
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
                    throw { code: -1, description: `core.contest.time: data is not type of object, instead got ${typeof data}` }

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

                let timer = new stopClock();
                
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

            async __update() {
                let beginTime = this.timeData.begin;
                let duringTime = this.timeData.during;
                let offsetTime = this.timeData.offset;
                let t = beginTime - time() + duringTime;
    
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
            reload: $("#problemsListReload"),

            optimize: false,
            runningList: [],

            async init() {
                await this.fetchList();
                this.reload.addEventListener("mouseup", () => this.fetchList());

                clog("okay", "Initialised:", {
                    color: flatc("red"),
                    text: "core.contest.list"
                });
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
                let time = new core.contest.time(data.time);

                var item = buildElementTree("span", "item", [
                    {
                        type: "div",
                        class: ["lazyload", "thumbnail"],
                        name: "thumbnailContainer",
                        list: [
                            { type: "img", name: "thumbnail" },
                            { type: "div", class: "simple-spinner", name: "spinner" }
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
                item.obj.addEventListener("mouseup", (e) => core.contest.problem.open(data.id));
                item.obj.thumbnailContainer.thumbnail.addEventListener("load", () => item.obj.thumbnailContainer.dataset.loaded = 1);
                item.obj.thumbnailContainer.thumbnail.src = data.thumbnail;

                time.timeUpdateHandler = (data) => {
                    if (this.optimize)
                        return;

                    time.showMs = (data.phase === 2 || data.phase === 3) && core.contest.showMs;
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
                time: null,
                name: $("#problemName"),
                timer: $("#problemTimer"),
                timerDetail: $("#problemTimerDetail"),
                bar: $("#problemProgressBar"),
                info: $("#problemProgressInfo")
            },

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

            result: {
                correct: $("#problemResultCorrect"),
                wrong: $("#problemResultWrong"),
                skipped: $("#problemResultSkipped"),
                point: $("#problemResultPoint"),
            },

            data: {},
            showing: false,
            previousRankHash: null,

            async init() {
                this.timer.time = new core.contest.time();
                
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

                this.markBox.addEventListener("wheel", (e) => {
                    clog("DEBG", "scroll", e);

                    if (e.deltaY > 0)
                        this.markBox.scrollLeft += 100;
                    else
                        this.markBox.scrollLeft -= 100;
                }, { passive: true });

                this.boardToggler.addEventListener("mouseup", () => this.changePanel(1));
                this.rankingToggler.addEventListener("mouseup", () => this.changePanel(2));
                this.quitBtn.addEventListener("mouseup", () => this.toggle(false));

                this.submitBtn.addEventListener("mouseup", async () => {
                    let data = this.getCheckedList();
                    await this.submit(data);
                    await this.loadData(this.data.id);
                    this.renderMarkBox(this.data.question, { readonly: true, data });
                });

                this.changePanel(1);
                this.toggle(false);

                clog("okay", "Initialised:", {
                    color: flatc("red"),
                    text: "core.contest.problem"
                });
            },

            changePanel(panel = 1) {
                if (this.mainBox.dataset.layout == panel)
                    return;
    
                switch (panel) {
                    case 1:
                        this.boardToggler.classList.add("active");
                        this.rankingToggler.classList.remove("active");
                        break;
                
                    case 2:
                        this.boardToggler.classList.remove("active");
                        this.rankingToggler.classList.add("active");
                        this.fetchRank(true);
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
                let updateRankTimer = new stopClock();
        
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
                                <th>Tổng</th>
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
                    core.navBar.classList.add("showTimer");
                    this.attachmentWrapper.dataset.display = false;
                    this.attachmentLink.style.display = "none";

                    // OPTIMIZE
                    core.contest.list.optimize = true;
                    this.timer.time.showMs = core.contest.showMs;
                    this.optimize(false);

                    core.contest.list.container.classList.add("hide");
                } else {
                    this.showing = false;
                    core.contest.list.optimize = false;
                    this.timer.time.showMs = false;
                    this.optimize(true);
                    core.navBar.classList.remove("showTimer");

                    localStorage.setItem(`problem.${this.data.id}`, this.getCheckedList().join(";"));
                    
                    this.attachmentWrapper.removeAttribute("data-loaded");
                    this.attachmentWrapper.removeChild(this.attachment);
                    let clone = this.attachment.cloneNode();
                    clone.src = "";
                    this.attachmentWrapper.insertBefore(clone, this.attachmentWrapper.childNodes[0]);
                    this.attachment = clone;

                    core.contest.list.container.classList.remove("hide");
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

            loadAttachment(data) {
                this.attachmentWrapper.removeAttribute("data-loaded");

                if (data.attachment.url) {
                    this.attachmentLink.href = data.attachment.url;
                    this.attachmentLink.innerText = `${data.attachment.file} (${convertSize(data.attachment.size)})`;
                    this.attachmentLink.style.display = "block";

                    let isImage = ["png", "jpg"].includes(data.attachment.extension);
                    this.attachmentWrapper.dataset.display = true;
                    this.attachmentWrapper.dataset.type = isImage ? "image" : "document";

                    if (data.attachment.embed) {
                        this.attachmentWrapper.removeChild(this.attachment);
    
                        setTimeout(() => {
                            let newNode = document.createElement(isImage ? "img" : "embed");
                            newNode.id = "problemAttachment";

                            newNode.style.display = "block";
                            newNode.addEventListener("load", () => this.attachmentWrapper.dataset.loaded = 1 );
                            newNode.src = `${data.attachment.url}&embed=true#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0&page=1&view=FitH`;
                            
                            this.attachmentWrapper.insertBefore(newNode, this.attachmentWrapper.childNodes[0]);
                            this.attachment = newNode;
                        }, 500);
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
                                >
                                <div class="checkmark">${item}</div>
                            </label>
                        `

                    html += `
                        <span class="input" data-question="${i}">
                            <t class="label">Câu ${i}</t>
                            ${input}
                        </span>
                    `
                }

                this.markBox.innerHTML = html;
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
                            okay: { text: "NÀO TA HÃY CỨ BẤT CHẤP HẾT NỘP BÀI ĐI~", color: "blue" },
                            cancel: { text: "ABORT MISSION!", color: "red" },
                        }
                    });

                    if (res !== "okay")
                        return;
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
                    return;
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
                                    r.parentElement.dataset.color = "yellow";
                                    a = c.querySelector(`#problemQuestion_${i+1}${item.answer}`);
                                    a.parentElement.dataset.color = "red";
                                    a.parentElement.dataset.force = true;
                                    break;
    
                                case "skipped":
                                    c.dataset.status = "skipped";
                                    r = c.querySelector(`#problemQuestion_${i+1}${item.result}`);
                                    r.checked = true;
                                    r.parentElement.dataset.color = "blue";
                                    break;
    
                                default:
                                    clog("WARN", "core.contest.problem.printResult(): unknwon item status:", item.status);
                                    continue;
                            }
                    }
                }, 1000);
            }
        }
    },
    
    userSettings: {
        panel: class {
            constructor(elem) {
                if (!elem.classList.contains("panel"))
                    return false;
        
                this.container = $("#userSettings");

                this.elem = elem;
                this.eToggle = null;
                this.btn_group = fcfn(elem, "btn-group");
                this.btn_reload = fcfn(this.btn_group, "reload");
                this.btn_close = fcfn(this.btn_group, "close");
                this.btn_custom = fcfn(this.btn_group, "custom")
                this.emain = fcfn(elem, "main");
                this.funcOnToggle = () => {};

                this.btn_close.addEventListener("click", () => this.hide());
            }
        
            hide() {
                this.elem.classList.remove("show");
                this.container.classList.remove("subPanel");

                if (this.eToggle)
                    this.eToggle.classList.remove("active");

                this.funcOnToggle("hide");
            }

            show() {
                this.__hideActive();
                this.elem.classList.add("show");
                this.container.classList.add("subPanel");

                if (this.eToggle)
                    this.eToggle.classList.add("active");

                this.funcOnToggle("show");
            }

            toggle() {
                let c = !this.elem.classList.contains("show");
                this.__hideActive();
                this.container.classList[c ? "add" : "remove"]("subPanel");
 
                if (c)
                    this.elem.classList.add("show");

                if (this.eToggle)
                    this.eToggle.classList[c ? "add" : "remove"]("active");

                this.funcOnToggle(c ? "show" : "hide");                
            }

            __hideActive() {
                var l = this.elem.parentElement.getElementsByClassName("show");

                for (var i = 0; i < l.length; i++)
                    l[i].classList.remove("show");
                
            }

            set toggler(e) {
                this.eToggle = e;
                e.addEventListener("click", e => this.toggle(e));
            }

            set onToggle(f) {
                this.funcOnToggle = f;
            }

            get main() {
                return this.emain;
            }

            get ref() {
                var t = this;
                return {
                    onClick(f = () => {}) {
                        t.btn_reload.addEventListener("click", f, true);
                    },
        
                    hide(h = true) {
                        if (h)
                            t.btn_reload.style.display = "none";
                        else
                            t.btn_reload.style.display = "block";
                    }
                }
            }

            get cus() {
                var t = this;
                return {
                    onClick(f = () => {}) {
                        t.btn_custom.addEventListener("click", f, true);
                    },
        
                    hide(h = true) {
                        if (h)
                            t.btn_custom.style.display = "none";
                        else
                            t.btn_custom.style.display = "block";
                    }
                }
            }
        },

        toggleSwitch: class {
            constructor(inputElement, cookieKey, onCheck = async () => {}, onUncheck = async () => {}, defValue = false) {
                this.input = inputElement;
                this.onCheckHandler = onCheck;
                this.onUnCheckHandler = onUncheck;

                this.input.addEventListener("change", async e => {
                    let r = true;

                    if (e.target.checked === true)
                        r = await this.onCheckHandler();
                    else
                        r = await this.onUnCheckHandler();

                    if (r !== "cancel")
                        cookie.set(cookieKey, e.target.checked);
                    else
                        e.target.checked = !e.target.checked;
                })
                
                this.change(cookie.get(cookieKey, defValue) === "true");
            }

            change(value) {
                this.input.checked = value;
                this.input.dispatchEvent(new Event("change"));
            }

            set onCheck(handler) {
                this.onCheckHandler = handler;
            }

            set onUnCheck(handler) {
                this.onUnCheckHandler = handler;
            }
        },

        userName: $("#userName"),
        userAvatar: $("#userAvatar"),
        userSettingAvatar: $("#usett_avt"),
        userSettingAvatarWrapper: $("#usett_avtw"),
        userSettingAvatarInput: $("#usett_avtinp"),
        name: $("#usett_name"),
        sub: {
            nameForm: $("#usett_edit_name_form"),
            passForm: $("#usett_edit_pass_form"),
            name: $("#usett_edit_name"),
            pass: $("#usett_edit_pass"),
            newPass: $("#usett_edit_npass"),
            reNewPass: $("#usett_edit_renpass"),
        },
        soundsToggler: {
            soundToggle: $("#usett_btn_sound_toggle"),
            soundOnMouseHover: $("#usett_btn_sound_mouse_hover"),
            soundOnBtnClick: $("#usett_btn_sound_button_click"),
            soundOnPanelToggle: $("#usett_btn_sound_panel_toggle"),
            soundOthers: $("#usett_btn_sound_others"),
            soundOnNotification: $("#usett_btn_sound_notification"),
        },
        logoutBtn: $("#usett_logout"),
        nightModeToggler: $("#usett_nightMode"),
        transitionToggler: $("#usett_transition"),
        millisecondToggler: $("#usett_millisecond"),
        toggler: $("#userSettingsToggler"),
        container: $("#userSettings"),
        panelContainer: $("#usett_panelContainer"),
        panelUnderlay: $("#usett_panelUnderlay"),
        adminConfig: $("#usett_adminConfig"),
        aboutPanel: null,
        licensePanel: null,
        licenseIframe: null,

        default: {
            sounds: false,
            nightmode: false,
            showMs: false,
            transition: true
        },

        __hideAllPanel() {
            var l = this.panelContainer.getElementsByClassName("show");

            for (var i = 0; i < l.length; i++)
                l[i].classList.remove("show");
        },
        
        init(loggedIn = true) {
            this.toggler.addEventListener("mouseup", () => this.toggle(), false);
            this.panelUnderlay.addEventListener("click", () => this.toggle(), false);

            this.aboutPanel = new this.panel($("#usett_aboutPanel"));
            this.aboutPanel.toggler = $("#usett_aboutToggler");

            this.licensePanel = new this.panel($("#usett_licensePanel"));
            this.licensePanel.toggler = $("#usett_licenseToggler");
            this.licenseIframe = fcfn(this.licensePanel.main, "cpanel-container");
            this.licensePanel.ref.onClick(() => this.licenseIframe.contentWindow.location.reload());

            this.adminConfig.style.display = "none";

            // LOAD DEFAULT SETTINGS FROM SERVER
            if (SERVER && SERVER.clientConfig)
                for (let key of Object.keys(this.default))
                    if (typeof SERVER.clientConfig[key] !== "undefined")
                        this.default[key] = SERVER.clientConfig[key];


            // Sounds Toggler Settings
            new this.toggleSwitch(this.soundsToggler.soundToggle, "__s_m", () => {
                sounds.enable.master = true;

                this.soundsToggler.soundOnMouseHover.disabled = false;
                this.soundsToggler.soundOnBtnClick.disabled = false;
                this.soundsToggler.soundOnPanelToggle.disabled = false;
                this.soundsToggler.soundOthers.disabled = false;
                this.soundsToggler.soundOnNotification.disabled = false;
            }, () => {
                sounds.enable.master = false;

                this.soundsToggler.soundOnMouseHover.disabled = true;
                this.soundsToggler.soundOnBtnClick.disabled = true;
                this.soundsToggler.soundOnPanelToggle.disabled = true;
                this.soundsToggler.soundOthers.disabled = true;
                this.soundsToggler.soundOnNotification.disabled = true;
            }, this.default.sounds);

            new this.toggleSwitch(this.soundsToggler.soundOnMouseHover, "__s_mo",
                () => sounds.enable.mouseOver = true,
                () => sounds.enable.mouseOver = false,
                true
            );

            new this.toggleSwitch(this.soundsToggler.soundOnBtnClick, "__s_bc",
                () => sounds.enable.btnClick = true,
                () => sounds.enable.btnClick = false,
                true
            );

            new this.toggleSwitch(this.soundsToggler.soundOnPanelToggle, "__s_pt",
                () => sounds.enable.panelToggle = true,
                () => sounds.enable.panelToggle = false,
                true
            );

            new this.toggleSwitch(this.soundsToggler.soundOthers, "__s_ot",
                () => sounds.enable.others = true,
                () => sounds.enable.others = false,
                true
            );

            new this.toggleSwitch(this.soundsToggler.soundOnNotification, "__s_nf",
                () => sounds.enable.notification = true,
                () => sounds.enable.notification = false,
                true
            );

            // Night mode setting
            new this.toggleSwitch(this.nightModeToggler, "__darkMode", e => {
                document.body.classList.add("dark");

                this.licenseIframe.contentWindow.document.body.classList.add("dark");

                if (core.settings.cPanelIframe)
                    core.settings.cPanelIframe.contentWindow.document.body.classList.add("dark");

                if (core.settings.aPanelIframe)
                    core.settings.aPanelIframe.contentWindow.document.body.classList.add("dark");
            }, () => {
                document.body.classList.remove("dark");

                this.licenseIframe.contentWindow.document.body.classList.remove("dark");

                if (core.settings.cPanelIframe)
                    core.settings.cPanelIframe.contentWindow.document.body.classList.remove("dark");

                if (core.settings.aPanelIframe)
                    core.settings.aPanelIframe.contentWindow.document.body.classList.remove("dark");
            }, this.default.nightmode);

            // Millisecond setting
            new this.toggleSwitch(this.millisecondToggler, "__showms",
                () => core.contest.showMs = true,
                () => core.contest.showMs = false,
                this.default.showMs
            )
            
            // Transition setting
            new this.toggleSwitch(this.transitionToggler, "__transition",
                () => document.body.classList.remove("disableTransition"),
                () => document.body.classList.add("disableTransition"),
                this.default.transition
            )

            // If not logged in, Stop here
            if (!loggedIn) {
                $("#usett_userPanel").style.display = "none";

                clog("okay", "Initialised:", {
                    color: flatc("red"),
                    text: "core.userSettings (notLoggedIn mode)"
                });
                return;
            }

            this.userSettingAvatarWrapper.addEventListener("dragenter",  e => this.dragEnter(e), false);
            this.userSettingAvatarWrapper.addEventListener("dragleave", e => this.dragLeave(e), false);
            this.userSettingAvatarWrapper.addEventListener("dragover", e => this.dragOver(e), false);
            this.userSettingAvatarWrapper.addEventListener("drop", e => this.fileSelect(e), false);

            this.userSettingAvatarInput.addEventListener("change", e => this.fileSelect(e, "input"));

            this.sub.nameForm.addEventListener("submit", e => {
                this.sub.nameForm.getElementsByTagName("button")[0].disabled = true;
                this.changeName(this.sub.name.value);
            }, false)

            this.sub.reNewPass.addEventListener("keyup", e => e.target.parentElement.dataset.color = (this.sub.newPass.value === e.target.value) ? "blue" : "red");
            this.sub.passForm.addEventListener("submit", e => {
                if (this.sub.newPass.value !== this.sub.reNewPass.value) {
                    sounds.warning();
                    this.sub.reNewPass.parentElement.dataset.color = "red";
                    this.sub.reNewPass.focus();
                    return;
                }

                this.sub.passForm.getElementsByTagName("button")[0].disabled = true;
                this.changePassword(this.sub.pass.value, this.sub.newPass.value);
            }, false)

            this.logoutBtn.addEventListener("click", e => this.logout(e), false);

            clog("okay", "Initialised:", {
                color: flatc("red"),
                text: "core.userSettings"
            });

        },

        logout() {
            myajax({
                url: "/api/logout",
                method: "POST",
                form: {
                    token: API_TOKEN
                }
            }, () => location.reload());
        },

        toggle() {
            let c = this.container.classList.contains("show");

            if (c)
                this.__hideAllPanel();

            this.container.classList.remove("subPanel");
            this.toggler.parentElement.classList.toggle("activeHamburger");
            this.container.classList.toggle("show");
        },

        reset() {
            this.userSettingAvatarWrapper.classList.remove("drop");
            this.userSettingAvatarWrapper.classList.remove("load");
            this.sub.nameForm.getElementsByTagName("button")[0].disabled = false;
            this.sub.passForm.getElementsByTagName("button")[0].disabled = false;
            this.sub.name.value = null;
            this.sub.pass.value = null;
            this.sub.newPass.value = null;
            this.sub.reNewPass.value = null;
            this.sub.reNewPass.parentElement.dataset.color = "blue";
        },

        reload(data, reload) {
            switch (reload) {
                case "avatar":
                    this.userAvatar.src = this.userSettingAvatar.src = `${data.src}&t=${time()}`;
                    break;
            
                case "name":
                    this.userName.innerText = this.name.innerText = data.name;
                    break;

                default:
                    break;
            }
        },
        
        async changeName(name) {
            sounds.confirm(1);

            await myajax({
                url: "/api/edit",
                method: "POST",
                form: {
                    name: name,
                    token: API_TOKEN
                }
            }, response => {
                this.reset();
                this.reload(response.data, "name");

                clog("okay", "Đã đổi tên thành", {
                    color: flatc("pink"),
                    text: response.data.name
                });
            }, () => this.reset());
        },

        async changePassword(pass, newPass) {
            sounds.confirm(2);

            await myajax({
                url: "/api/edit",
                method: "POST",
                form: {
                    password: pass,
                    newPassword: newPass,
                    token: API_TOKEN
                }
            }, () => {
                clog("okay", "Thay đổi mật khẩu thành công!");
                this.reset();
            }, () => {
                sounds.warning();
                this.reset();
            });
        },

        fileSelect(e, type = "drop") {
            if (type === "drop") {
                e.stopPropagation();
                e.preventDefault();
                this.userSettingAvatarWrapper.classList.remove("drag");
            }

            var file = (type === "drop") ? e.dataTransfer.files[0] : e.target.files[0];

            this.userSettingAvatarWrapper.classList.add("load");
            sounds.confirm();
            setTimeout(() => this.avtUpload(file), 1000);
        },

        async avtUpload(file) {
            await myajax({
                url: "/api/avatar",
                method: "POST",
                form: {
                    token: API_TOKEN,
                    file: file
                }
            }, response => {
                this.reset();
                this.reload(response.data, "avatar");
                sounds.notification();

                clog("okay", "Avatar changed.");
            }, () => {
                sounds.warning();
                this.reset();
            })
        },

        dragEnter(e) {
            e.stopPropagation();
            e.preventDefault();
            this.userSettingAvatarWrapper.classList.add("drag");
        },

        dragLeave(e) {
            e.stopPropagation();
            e.preventDefault();
            this.userSettingAvatarWrapper.classList.remove("drag");
        },

        dragOver(e) {
            e.stopPropagation();
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            this.userSettingAvatarWrapper.classList.add("drag");
        }
    },

    settings: {
        cPanel: null,
        cPanelIframe: null,
        aPanel: null,
        aPanelIframe: null,
        pPanel: null,
        lPanel: null,
        adminConfig: $("#usett_adminConfig"),

        async init() {
            this.adminConfig.style.display = "block";
            this.cPanel = new core.userSettings.panel($("#settings_controlPanel"));
            this.aPanel = new core.userSettings.panel($("#settings_accountEditor"));
            this.pPanel = new core.userSettings.panel($("#settings_problem"));
            this.lPanel = new core.userSettings.panel($("#settings_syslogs"));
            this.cPanelIframe = this.cPanel.main.getElementsByTagName("iframe")[0];
            this.aPanelIframe = this.aPanel.main.getElementsByTagName("iframe")[0];
            this.cPanelIframe.src = "config.php";
            this.aPanelIframe.src = "account.php";

            this.cPanel.toggler = $("#settings_cPanelToggler");
            this.aPanel.toggler = $("#settings_accountEditorToggler");
            this.pPanel.toggler = $("#settings_problemToggler");
            this.lPanel.toggler = $("#settings_syslogsToggler");

            await this.problems.init();
            await this.syslogs.init(this.lPanel);

            this.cPanel.ref.onClick(() => {
                this.cPanelIframe.contentWindow.update();
                clog("okay", "Reloaded controlPanel.");
            })

            this.aPanel.ref.onClick(() => {
                this.aPanelIframe.contentWindow.reloadAccountList();
                clog("okay", "Reloaded accountEditorPanel.");
            })

            this.pPanel.ref.onClick(() => {
                this.problems.getList();
                this.problems.resetForm();
                this.problems.showList();
                clog("okay", "Reloaded Problems Panel.");
            })

            this.lPanel.ref.onClick(() => this.syslogs.refresh());
            this.lPanel.onToggle = s => ((s === "show") ? this.syslogs.refresh() : null);

            clog("okay", "Initialised:", {
                color: flatc("red"),
                text: "core.settings"
            });
        },

        syslogs: {
            panel: null,
            container: null,
            logsContainer: null,
            nav: {
                left: null,
                btnLeft: null,
                currentPage: null,
                btnRight: null,
                right: null
            },
            prevHash: "",
            showPerPage: 10,
            currentPage: 0,
            maxPage: 0,

            async init(panel) {
                this.panel = panel;
                this.container = panel.main;
                this.logsContainer = fcfn(this.container, "logsContainer");
                this.nav.left = fcfn(this.container, "left");
                this.nav.btnLeft = fcfn(this.container, "buttonLeft");
                this.nav.currentPage = fcfn(this.container, "currentPage");
                this.nav.btnRight = fcfn(this.container, "buttonRight");
                this.nav.right = fcfn(this.container, "right");
                this.panel.cus.onClick(() => this.refresh(true))

                await this.refresh();

                this.nav.btnLeft.addEventListener("click", e => {
                    this.currentPage--;

                    if (this.currentPage < 0)
                        this.currentPage = 0;

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
                let response = await myajax({
                    url: "/api/logs",
                    method: "POST",
                    form: {
                        token: API_TOKEN,
                        clear: clearLogs,
                        show: this.showPerPage,
                        page: this.currentPage
                    }
                });

                let data = response.data;
                let hash = response.hash;
                if (hash === this.prevHash)
                    return;

                this.prevHash = hash;
                this.nav.left.innerText = `Hiển thị ${data.from} - ${data.to}`;
                this.nav.currentPage.innerText = `Trang ${data.pageNth + 1}/${data.maxPage + 1}`;
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
                clog("info", "Refreshed SysLogs");
            }
        },

        problems: {
            title: $("#problemEdit_title"),
            headerBtn: {
                back: $("#problemEdit_btn_back"),
                add: $("#problemEdit_btn_add"),
                check: $("#problemEdit_btn_check"),
            },
            form: {
                form: $("#problemEdit_form"),
                id: $("#problemEdit_id"),
                name: $("#problemEdit_name"),
                point: $("#problemEdit_point"),
                beginDate: $("#problemEdit_beginDate"),
                beginTime: $("#problemEdit_beginTime"),
                during: $("#problemEdit_during"),
                offset: $("#problemEdit_offset"),
                thumbnail: $("#problemEdit_thumbnail"),
                thumbnailPreview: $("#problemEdit_thumbnailPreview"),
                deleteThumbnail: $("#problemEdit_deleteThumbnail"),
                attachment: $("#problemEdit_attachment"),
                deleteAttachment: $("#problemEdit_deleteAttachment"),
                testList: $("#problemEditTestList"),
                testadd: $("#problemEditTestAdd"),
                submit() { $("#problemEditSubmit").click() }
            },
            list: $("#problemEdit_list"),
            action: null,

            hide(elem) {
                elem.style.display = "none";
            },

            show(elem) {
                elem.style.display = "inline-block";
            },

            async init() {
                this.hide(this.headerBtn.back);
                this.hide(this.headerBtn.check);
                this.headerBtn.check.addEventListener("click", e => this.form.submit());
                this.headerBtn.back.addEventListener("click", e => this.showList());
                this.headerBtn.add.addEventListener("click", e => this.newProblem());
                this.form.form.addEventListener("submit", e => this.postSubmit());
                this.form.thumbnailPreview.addEventListener("load", e => e.target.parentElement.dataset.loaded = 1);

                this.form.thumbnail.addEventListener("change", async e => {
                    sounds.confirm(0);
                    let file = e.target.files[0];
                    
                    this.form.thumbnailPreview.parentElement.removeAttribute("data-loaded");
                    this.form.thumbnailPreview.parentElement.classList.remove("blank");
                    this.form.thumbnailPreview.src = URL.createObjectURL(file);
                })

                this.form.testadd.addEventListener("click", e => {
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
                                >
                                <div class="checkmark">${mark}</div>
                            </label>
                        `
                    }

                    html = `
                        <div class="cell">
                            ${input}
                            <span class="delete" onClick="core.settings.problems.rmTest(this)"></span>
                        </div>
                    `

                    this.form.testList.insertAdjacentHTML("beforeend", html);
                });

                await this.getList();

                clog("okay", "Initialised:", {
                    color: flatc("red"),
                    text: "core.settings.problems"
                });
            },

            rmTest(elem) {
                this.form.testList.removeChild(elem.parentNode);
            },

            hideList() {
                this.list.classList.add("hide");
                this.hide(this.headerBtn.add);
                this.show(this.headerBtn.back);
                this.show(this.headerBtn.check);
            },

            showList() {
                this.list.classList.remove("hide");
                this.show(this.headerBtn.add);
                this.hide(this.headerBtn.back);
                this.hide(this.headerBtn.check);
                this.title.innerText = "Danh sách";
            },

            async getList() {
                let response = await myajax({
                    url: "/api/problems/list",
                    method: "GET"
                });

                let data = response.data;
                let html = "";
                emptyNode(this.list);

                for (let item of data)
                    html += `
                        <li class="item">
                            <img class="icon" src="${item.thumbnail}">
                            <ul class="title">
                                <li class="id">${item.id}</li>
                                <li class="name">${item.name}</li>
                            </ul>
                            <div class="action">
                                <span class="delete" onClick="core.settings.problems.remProblem('${item.id}')"></span>
                                <span class="edit" onClick="core.settings.problems.editProblem('${item.id}')"></span>
                            </div>
                        </li>
                    `

                this.list.innerHTML = html;
            },

            resetForm() {
                this.form.id.value = "";
                this.form.id.disabled = false;
                this.form.name.value = "";
                this.form.point.value = 10;
                this.form.beginDate.value = "";
                this.form.beginTime.value = "";
                this.form.during.value = 60;
                this.form.offset.value = 10;
                this.form.thumbnail.value = "";
                this.form.attachment.value = "";
            },

            newProblem() {
                this.resetForm();
                this.form.id.disabled = false;
                this.form.deleteAttachment.disabled = true;
                this.form.deleteThumbnail.disabled = true;
                this.form.thumbnailPreview.src = "";
                this.form.thumbnailPreview.parentElement.removeAttribute("data-loaded");
                this.form.thumbnailPreview.parentElement.classList.add("blank");
                this.title.innerText = "Thêm đề";
                this.action = "add";
                this.hideList();
                setTimeout(e => this.form.id.focus(), 300);
            },

            async editProblem(id) {
                let response = await myajax({
                    url: "/api/problems/get",
                    method: "GET",
                    query: {
                        id: id
                    }
                });

                let data = response.data;
                clog("info", "Editing problem", {
                    color: flatc("yellow"),
                    text: id
                });

                this.resetForm();
                this.title.innerText = data.id;
                this.action = "edit";
                let time = new Date(data.time.begin * 1000);

                this.form.id.value = data.id;
                this.form.id.disabled = true;
                this.form.name.value = data.name;
                this.form.point.value = data.point;
                this.form.beginDate.valueAsDate = time;
                this.form.beginTime.valueAsDate = time;
                this.form.during.value = data.time.during / 60;
                this.form.offset.value = data.time.offset;
                this.form.attachment.value = "";

                if (data.thumbnail) {
                    this.form.thumbnailPreview.parentElement.classList.remove("blank");
                    this.form.thumbnailPreview.src = data.thumbnail;
                    this.form.deleteThumbnail.disabled = false;

                    this.form.deleteThumbnail.onclick = async () => {
                        if (await this.deleteFile("thumbnail", data.id))
                            this.form.deleteThumbnail.disabled = true;
                    }
                } else {
                    this.form.thumbnailPreview.src = "";
                    this.form.thumbnailPreview.parentElement.classList.add("blank");
                    this.form.deleteThumbnail.disabled = true;
                }

                if (data.attachment && data.attachment.file) {
                    this.form.deleteAttachment.disabled = false;
                    this.form.deleteAttachment.onclick = async () => {
                        if (await this.deleteFile("attachment", data.id, data.attachment.file))
                            this.form.deleteAttachment.disabled = true;
                    }
                } else
                    this.form.deleteAttachment.disabled = true;

                let html = "";

                for (let i = 1; i <= data.answer.length; i++) {
                    let item = data.answer[i - 1];
                    let answer = ["A", "B", "C", "D"];
                    let input = "";

                    for (let mark of answer)
                        input += `
                            <label for="problemEdit_${i}${mark}" class="circleCheckbox">
                                <input
                                    id="problemEdit_${i}${mark}"
                                    name="problemEdit_${id}${i}"
                                    type="radio" value="${mark}"
                                    ${(typeof item === "string" && item === mark) ? "checked" : ""}
                                >
                                <div class="checkmark">${mark}</div>
                            </label>
                        `

                    html += `
                        <div class="cell">
                            ${input}
                            <span class="delete" onClick="core.settings.problems.rmTest(this)"></span>
                        </div>
                    `
                }

                this.form.testList.innerHTML = html;
                
                this.hideList();
                setTimeout(e => this.form.name.focus(), 300);
            },

            async remProblem(id) {
                clog("warn", "Deleting Problem", {
                    color: flatc("yellow"),
                    text: id + "."
                }, "Waiting for confirmation");

                let note = document.createElement("div");
                note.classList.add("note", "warning");
                note.innerHTML = `<span class="inner">Hành động này <b>không thể hoàn tác</b> một khi đã thực hiện!</span>`;

                let confirm = await popup.show({
                    level: "warning",
                    windowTitle: "Problems Editor",
                    title: `Xóa \"${id}\"`,
                    message: `Xác nhận`,
                    description: `Bạn có chắc muốn xóa đề bài <i>${id}</i> không?`,
                    additionalNode: note,
                    buttonList: {
                        delete: { text: "XÓA!!!", color: "red" },
                        cancel: { text: "Hủy Bỏ", color: "blue" }
                    }
                })

                if (confirm !== "delete") {
                    clog("info", "Cancelled deletion of", {
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

                clog("okay", "Deleted Problem", {
                    color: flatc("yellow"),
                    text: id
                });

                this.getList();
                this.showList();
                core.problems.getList();
            },

            async postSubmit() {
                this.title.innerText = "Đang lưu...";

                let data = {
                    id: this.form.id.value,
                    name: this.form.name.value,
                    point: parseInt(this.form.point.value),
                    time: {
                        begin: time(new Date(`${this.form.beginDate.value} ${this.form.beginTime.value}`)),
                        during: parseInt(this.form.during.value * 60),
                        offset: parseInt(this.form.offset.value)
                    },
                    thumbnail: (this.form.thumbnail.files.length !== 0) ? this.form.thumbnail.files[0] : null,
                    attachment: (this.form.attachment.files.length !== 0) ? this.form.attachment.files[0] : null
                }

                let test = new Array();
                let testList = this.form.testList.querySelectorAll("div.cell");

                for (let item of testList) {
                    let c = item.querySelector("input:checked");

                    if (!c)
                        continue;

                    test.push(c.value);
                }
                
                data.test = test;
                await this.submit(this.action, data);

                this.getList();
                this.showList();
                core.contest.list.fetchList();
            },

            async submit(action, data) {
                if (["edit", "add"].indexOf(action) === -1)
                    return false;

                clog("info", "Problem Submit: ", {
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
                            id: data.id,
                            name: data.name,
                            point: data.point,
                            begin: data.time.begin,
                            during: data.time.during,
                            offset: data.time.offset,
                            thumbnail: data.thumbnail,
                            attachment: data.attachment,
                            result: JSON.stringify(data.test),
                            token: API_TOKEN
                        }
                    });
                } catch(e) {
                    errorHandler(e);
                    throw e;
                }
            },

            async deleteFile(type, id, fileName = null) {
                if (!["thumbnail", "attachment"].includes(type))
                    return false;

                typeName = { thumbnail: "Ảnh Đính Kèm", attachment: "Tệp Đính Kèm" }[type]

                clog("WARN", "Preparing to delete", typeName, "of", {
                    color: flatc("yellow"),
                    text: `${id}.`
                }, "Waiting for confirmation...");

                let note = document.createElement("div");
                note.classList.add("note", "warning");
                note.innerHTML = `<span class="inner">Hành động này <b>không thể hoàn tác</b> một khi đã thực hiện!</span>`;

                let action = await popup.show({
                    windowTitle: "Xác nhận",
                    title: `Xóa ${typeName} của đề "${id}"`,
                    description: `Bạn có chắc muốn xóa ${fileName ? `<b>${fileName}</b>` : "không"}?`,
                    additionalNode: note,
                    level: "warning",
                    buttonList: {
                        delete: { color: "pink", text: "XÓA!!!" },
                        cancel: { color: "blue", text: "Hủy" }
                    }
                })

                if (action !== "delete") {
                    clog("INFO", "Cancelled deletion", typeName, "of", {
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

                clog("OKAY", "Deleted", typeName, "of", {
                    color: flatc("yellow"),
                    text: id
                })

                return true;
            },
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
            <div class="simple-spinner"></div>
        `;

        let gud = await popup.show({
            windowTitle: "Memes",
            title: "got some mweme fow yya",
            message: `<a href="${wutMeme.postLink}" target="_blank">SAUCE 🔗</a>`,
            description: wutMeme.title,
            additionalNode: memeContainer,
            buttonList: {
                moar: { text: "Plz I Need Moar", color: "rainbow" },
                stahp: { text: "Ewnough iwntewwnet fow todayy", color: "dark" }
            }
        })

        this.deliveringMeme = false;

        if (gud === "moar")
            this.getRandomMeme();
    }
}