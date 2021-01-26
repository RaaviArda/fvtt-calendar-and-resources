class Calendar extends Application {
    isOpen = false;
    content = "";
    WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    static get defaultOptions() {
        const options = super.defaultOptions;
        if (game.user.isGM) {
            options.template = "modules/calendar-and-resources/templates/calendar-gm.html";
        } else {
            options.template = "modules/calendar-and-resources/templates/calendar-user.html";
        }
        options.popOut = false;
        options.resizable = false;
        return options;
    }

    setPos(pos) {
        return new Promise(resolve => {
            function check() {
                let elmnt = document.getElementById("calendar-disp-container");
                if (elmnt) {
                    elmnt.style.bottom = null;
                    let xPos = (pos.left) > window.innerWidth ? window.innerWidth - 200 : pos.left;
                    let yPos = (pos.top) > window.innerHeight - 20 ? window.innerHeight - 100 : pos.top;
                    elmnt.style.top = (yPos) + "px";
                    elmnt.style.left = (xPos) + "px";
                    elmnt.style.position = 'fixed';
                    elmnt.style.zIndex = "100";
                    resolve();
                } else {
                    setTimeout(check, 30);
                }
            }

            check();
        });
    }

    loadSettings() {
        let flag = game.user.getFlag('calendar-and-resources', 'calendarDisplay');
        if (flag !== undefined && flag !== null) {
            let pos = flag.calendarPos;
            this.setPos(pos);
        }
    }

    resetPos() {
        let pos = {bottom: 8, left: 15}
        return new Promise(resolve => {
            function check() {
                let elmnt = document.getElementById("calendar-disp-container");
                if (elmnt) {
                    console.log('calendar-display | Resetting Calendar Display Position');
                    elmnt.style.top = null;
                    elmnt.style.bottom = (pos.bottom) + "%";
                    elmnt.style.left = (pos.left) + "%";
                    let pos = {top: elmnt.offsetTop, left: elmnt.offsetLeft};
                    game.user.update({flags: {'calendar-and-resources': {'calendarDisplay': {'calendarPos': pos}}}});
                    elmnt.style.bottom = null;
                    resolve();
                } else {
                    setTimeout(check, 30);
                }
            }

            check();
        })
    }

    async toggleCalendar() {
        console.log('calendar-display | Toggling Calendar Display.');
        let templatePath = "modules/calendar-and-resources/templates/calendar-gm.html";
        if (!game.user.isGM) {
            templatePath = "modules/calendar-and-resources/templates/calendar-user.html";
        }
        if (this.isOpen) {
            this.isOpen = false;
            await this.close();
        } else {
            this.isOpen = true;
            this.content = await renderTemplate(templatePath, {});
            await this.render(true);
        }
    }

    updateDisplay() {
        let dateElement = document.getElementById("calendar-date");
        let timeElement = document.getElementById("calendar-time");
        let dateYear = localData.calendarDate.getUTCFullYear() + localData.calendarYearAdjust;
        let dateWeekday = this.WEEKDAYS[localData.calendarDate.getUTCDay()];

        dateElement.innerHTML = this.zeroFill(localData.calendarDate.getUTCDate(), 2) + "-" +
                                this.zeroFill(localData.calendarDate.getUTCMonth() + 1, 2) + "-" +
                                dateYear + " (" +
                                dateWeekday + ")";

        timeElement.innerHTML = this.zeroFill(localData.calendarDate.getUTCHours(), 2) + ":" +
                                this.zeroFill(localData.calendarDate.getUTCMinutes(), 2);
    }

    async updateCalendar(calModifier) {
        if (!game.user.isGM) {
            return;
        }
        let currentDay = parseInt(localData.calendarDate.getUTCDay().toString());
        localData.calendarDate.setUTCHours(localData.calendarDate.getUTCHours() + parseInt(calModifier));
        let newDay = parseInt(localData.calendarDate.getUTCDay().toString());
        let dailyUsage = 0;
        if (currentDay !== newDay) {
            if (calModifier > 0) {
                ui.notifications.info("It's a brand new day!");
                dailyUsage = 1;
            } else {
                dailyUsage = -1;
            }
        }
        localData.partyResources.forEach((res) => {
            res.value -= res.usePerHour * calModifier;
            res.value -= res.usePerDay * dailyUsage;
            if (res.value <= 0) {
                ui.notifications.error("WARNING! Out of resource: " + res.name + "!");
                res.value = 0;
            }
        });
        await updateDataInSettings("calendarDate", localData.calendarDate.toISOString());
        await updateDataInSettings("partyResources", localData.partyResources);
    }

    async activateListeners(html) {
        const displays = '.calendar-button';
        const calendarMove = '#calendar-move';

        if (game.user.isGM) {
            html.find(displays).click(async ev => {
                ev.preventDefault();
                if (game.user.isGM) {
                    let calModifier = ev.target.dataset.calmodifier;
                    if (calModifier !== undefined && calModifier !== null) {
                        await this.updateCalendar(calModifier);
                    }
                }
            });
        }

        html.find(calendarMove).mousedown(ev => {
            ev.preventDefault();
            ev = ev || window.event;
            let isRightMB = false;
            if ("which" in ev) { // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
                isRightMB = ev.which === 3;
            } else if ("button" in ev) { // IE, Opera
                isRightMB = ev.button === 2;
            }

            if (!isRightMB) {
                dragElement(document.getElementById("calendar-disp-container"));
                let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

                function dragElement(elmnt) {
                    elmnt.onmousedown = dragMouseDown;

                    function dragMouseDown(e) {
                        e = e || window.event;
                        e.preventDefault();
                        pos3 = e.clientX;
                        pos4 = e.clientY;

                        document.onmouseup = closeDragElement;
                        document.onmousemove = elementDrag;
                    }

                    function elementDrag(e) {
                        e = e || window.event;
                        e.preventDefault();
                        // calculate the new cursor position:
                        pos1 = pos3 - e.clientX;
                        pos2 = pos4 - e.clientY;
                        pos3 = e.clientX;
                        pos4 = e.clientY;
                        // set the element's new position:
                        elmnt.style.bottom = null
                        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
                        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
                        elmnt.style.position = 'fixed';
                        elmnt.style.zIndex = "100";
                    }

                    function closeDragElement() {
                        // stop moving when mouse button is released:
                        elmnt.onmousedown = null;
                        document.onmouseup = null;
                        document.onmousemove = null;
                        let xPos = (elmnt.offsetLeft - pos1) > window.innerWidth ? window.innerWidth - 200 : (elmnt.offsetLeft - pos1);
                        let yPos = (elmnt.offsetTop - pos2) > window.innerHeight - 20 ? window.innerHeight - 100 : (elmnt.offsetTop - pos2)
                        xPos = xPos < 0 ? 0 : xPos;
                        yPos = yPos < 0 ? 0 : yPos;
                        if (xPos !== (elmnt.offsetLeft - pos1) || yPos !== (elmnt.offsetTop - pos2)) {
                            elmnt.style.top = (yPos) + "px";
                            elmnt.style.left = (xPos) + "px";
                        }

                        let pos = {top: yPos, left: xPos};
                        game.user.update({flags: {'calendar-and-resources': {'calendarDisplay': {'calendarPos': pos}}}});
                    }
                }
            } else if (isRightMB) {
                this.resetPos();
            }
        });
    }

    zeroFill(number, width) {
        width -= number.toString().length;
        if (width > 0) {
            return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
        }
        return number + ""; // always return a string
    }
}