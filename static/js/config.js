//? |-----------------------------------------------------------------------------------------------|
//? |  /static/js/config.js                                                                         |
//? |                                                                                               |
//? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
//? |-----------------------------------------------------------------------------------------------|

var pageIcon = $("#pageIcon");
var pageIconInput = $("#pageIconInput");
var pageIconReset = $("#pageIconReset");

var landingImage = $("#landingImage");
var landingImageInput = $("#landingImageInput");
var landingImageReset = $("#landingImageReset");

var app = {
    title: $("#contest_name"),
    description: $("#contest_description")
}

var time = {
    zone: $("#time_zone")
}

var pageTitle = $("#pageTitle");
var allowRegister = $("#allowRegister");

var edit = {
    name: $("#editName"),
    password: $("#editPassword"),
    avatar: $("#editAvatar")
}

var clientConfig = {
    sounds: $("#clientSounds"),
    nightmode: $("#clientNightmode"),
    showMs: $("#clientShowMs"),
    transition: $("#clientTransition"),
}

var ratelimit = {
    maxRequest: $("#ratelimit_maxRequest"),
    time: $("#ratelimit_time"),
    banTime: $("#ratelimit_banTime")
}

var cache = {
    contestRank: $("#cache_contestRank")
}

function cvtime(h, m, s) {
    return [h, m, s]
        .map(v => v < 10 ? "0" + v : v)
        .join(":");
}

function cvdate(d, m, y) {
    return [y, m, d]
        .map(v => v < 10 ? "0" + v : v)
        .join("-");
}

function prdate(inp) {
    var t = inp.split("-");
    return {
        y: parseInt(t[0]),
        m: parseInt(t[1]),
        d: parseInt(t[2])
    }
}

function prtime(inp) {
    var t = inp.split(":");
    return {
        h: parseInt(t[0] ? t[0] : 0),
        m: parseInt(t[1] ? t[1] : 0),
        s: parseInt(t[2] ? t[2] : 0)
    }
}

function update() {
    myajax({
        url: "/api/config",
        method: "GET",
    }, response => {
        let data = response.data;

        app.title.value = data.app.title;
        app.description.value = data.app.description;
        time.zone.value = data.time.zone;
        pageTitle.value = data.pageTitle;
        allowRegister.checked = data.allowRegister;
        edit.name.checked = data.edit.name;
        edit.password.checked = data.edit.password;
        edit.avatar.checked = data.edit.avatar;
        clientConfig.sounds.checked = data.clientConfig.sounds;
        clientConfig.nightmode.checked = data.clientConfig.nightmode;
        clientConfig.showMs.checked = data.clientConfig.showMs;
        clientConfig.transition.checked = data.clientConfig.transition;
        ratelimit.maxRequest.value = data.ratelimit.maxRequest;
        ratelimit.time.value = data.ratelimit.time;
        ratelimit.banTime.value = data.ratelimit.banTime;
        cache.contestRank.value = data.cache.contestRank;
    }, error => errorHandler(error));
}

const sbar = new statusBar(document.body);
sbar.additem(USERNAME, "account", {space: false, align: "left"});

document.__onclog = (type, ts, msg) => {
    type = type.toLowerCase();
    const typeList = ["okay", "warn", "errr", "crit", "lcnt"]
    if (typeList.indexOf(type) === -1)
        return false;

    sbar.msg(type, msg, {time: ts, lock: (type === "crit" || type === "lcnt") ? true : false});
}

$("body").onload = () => {
    if (cookie.get("__darkMode") === "true")
        document.body.classList.add("dark");

    if (window.frameElement)
        document.body.classList.add("embeded");

    // =========== IMAGE MODIFY EVENT ===========

    pageIcon.addEventListener("load", e => e.target.parentElement.dataset.loaded = 1);
    landingImage.addEventListener("load", e => e.target.parentElement.dataset.loaded = 1);

    pageIconInput.addEventListener("change", async e => {
        sounds.confirm(0);
        let file = e.target.files[0];

        try {
            await myajax({
                url: "/api/images/icon",
                method: "POST",
                form: {
                    token: API_TOKEN,
                    file: file
                }
            })
        } catch(e) { sounds.warning() }

        e.target.value = "";
        pageIcon.parentElement.removeAttribute("data-loaded");
        pageIcon.src = "/api/images/icon";
    })

    landingImageInput.addEventListener("change", async e => {
        sounds.confirm(2);
        let file = e.target.files[0];

        try {
            await myajax({
                url: "/api/images/landing",
                method: "POST",
                form: {
                    token: API_TOKEN,
                    file: file
                }
            })
        } catch(e) { sounds.warning() }

        e.target.value = "";
        landingImage.parentElement.removeAttribute("data-loaded");
        landingImage.src = "/api/images/landing";
    })

    pageIconReset.addEventListener("mouseup", async () => {
        sounds.notification();

        try {
            await myajax({
                url: "/api/images/icon",
                method: "DELETE",
                header: { token: API_TOKEN }
            })
        } catch(e) { sounds.warning() }

        pageIcon.parentElement.removeAttribute("data-loaded");
        pageIcon.src = "/api/images/icon";
    })

    landingImageReset.addEventListener("mouseup", async () => {
        sounds.notification();

        try {
            await myajax({
                url: "/api/images/landing",
                method: "DELETE",
                header: { token: API_TOKEN }
            })
        } catch(e) { sounds.warning() }

        landingImage.parentElement.removeAttribute("data-loaded");
        landingImage.src = "/api/images/landing";
    })

    // =========== END IMAGE MODIFY EVENT ===========

    pageIcon.src = "/api/images/icon";
    landingImage.src = "/api/images/landing";
    sounds.init();
    popup.init();
    update();
}

$("#formContainer").addEventListener("submit", e => {
    myajax({
        url: "/api/config",
        method: "POST",
        form: {
            "app.title": app.title.value,
            "app.description": app.description.value,
            "time.zone": time.zone.value,
            "pageTitle": pageTitle.value,
            "allowRegister": allowRegister.checked,
            "edit.name": edit.name.checked,
            "edit.password": edit.password.checked,
            "edit.avatar": edit.avatar.checked,
            "clientConfig.sounds": clientConfig.sounds.checked,
            "clientConfig.nightmode": clientConfig.nightmode.checked,
            "clientConfig.showMs": clientConfig.showMs.checked,
            "clientConfig.transition": clientConfig.transition.checked,
            "ratelimit.maxRequest": parseInt(ratelimit.maxRequest.value),
            "ratelimit.time": parseInt(ratelimit.time.value),
            "ratelimit.banTime": parseInt(ratelimit.banTime.value),
            "cache.contestRank": parseInt(cache.contestRank.value),
            "token": API_TOKEN
        }
    }, () => {
        clog("okay", "Thay đổi cài đặt thành công");
        update();
    }, error => errorHandler(error));
}, false);