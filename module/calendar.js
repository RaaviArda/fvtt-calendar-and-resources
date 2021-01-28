class Calendar extends Application {
    isOpen = false;
    content = "";
    WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    WINDS = ["N ↑", "NE ↗", "E →", "SE ↘", "S ↓", "SW ↙", "W ←", "NW ↖"];
    TEMP_AVG    = [ -10, -5,  0,  5, 10, 15, 20, 15, 10,  5,  0, -5];
    FOG_PROB    = [   5, 10,  5,  5,  5,  0,  0,  0,  5,  5, 10,  5];
    WEATHER_DIST = [
        {0: 18, 1: 40, 2: 0,  3: 40, 4: 2}, // 1
        {0: 35, 1: 30, 2: 0,  3: 30, 4: 5}, // 2
        {0: 40, 1: 30, 2: 10, 3: 10, 4: 10}, // 3
        {0: 40, 1: 30, 2: 20, 3: 0,  4: 10}, // 4
        {0: 65, 1: 20, 2: 10, 3: 0,  4: 5}, // 5
        {0: 83, 1: 10, 2: 5,  3: 0,  4: 2}, // 6
        {0: 83, 1: 10, 2: 5,  3: 0,  4: 2}, // 7
        {0: 80, 1: 10, 2: 5,  3: 0,  4: 5}, // 8
        {0: 65, 1: 20, 2: 10, 3: 0,  4: 5}, // 9
        {0: 45, 1: 30, 2: 20, 3: 0,  4: 5}, // 10
        {0: 45, 1: 30, 2: 10, 3: 10, 4: 5}, // 11
        {0: 38, 1: 30, 2: 0,  3: 30, 4: 2}, // 12
    ];
    WEATHER_TYPES = ["☼ clear", "☁ clouds", "🌧 rain", "🌨 snow", "⛈ thunderstorm"];


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

    getData(options) {
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
            let timeData = this.generateTimeData();
            let weatherData = this.generateTempAndWind(false);
            this.content = await renderTemplate(templatePath, {date: timeData, weather: weatherData});
            await this.render(true, {date: timeData, weather: weatherData});
        }
    }

    generateTimeData() {
        let dateWeekday = this.WEEKDAYS[localData.calendarDate.getUTCDay()];
        let dateDay = this.zeroFill(localData.calendarDate.getUTCDate(), 2);
        let dateMonth = this.zeroFill(localData.calendarDate.getUTCMonth() + 1, 2);
        let dateYear = localData.calendarDate.getUTCFullYear() + localData.calendarYearAdjust;
        let timeHour = this.zeroFill(localData.calendarDate.getUTCHours(), 2);
        let timeMinute = this.zeroFill(localData.calendarDate.getUTCMinutes(), 2);

        return {
            weekday: dateWeekday,
            day: dateDay,
            month: dateMonth,
            year: dateYear,
            hour: timeHour,
            minute: timeMinute
        };
    }

    generateWeatherDaily() {
        let month = localData.calendarDate.getUTCMonth();
        let fog = getRandomInt(1, 100) < this.FOG_PROB[month];
        let weather = weightedRand(this.WEATHER_DIST[month]);

        if (fog) {
            localData.currentWeather.conditions = this.WEATHER_TYPES[weather] + ", 🌫 foggy";
        } else {
            localData.currentWeather.conditions = this.WEATHER_TYPES[weather];
        }
    }

    generateTempAndWind(newWeather) {
        if (newWeather) {
            localData.currentWeather.temperature = this.generateTemperature();
            if (localData.currentWeather.wind.direction < 0) {
                localData.currentWeather.wind.direction = getRandomInt(0, 7);
            } else {
                localData.currentWeather.wind.direction += getRandomInt(-1, 1);
                if (localData.currentWeather.wind.direction < 0) {
                    localData.currentWeather.wind.direction = 7;
                } else if (localData.currentWeather.wind.direction > 7) {
                    localData.currentWeather.wind.direction = 0;
                }
            }

            if (localData.currentWeather.wind.strength < 3) {
                localData.currentWeather.wind.strength += getRandomInt(0, 3);
            } else if (localData.currentWeather.wind.strength < 5) {
                localData.currentWeather.wind.strength += getRandomInt(-1, 2);
            } else if (localData.currentWeather.wind.strength < 7) {
                localData.currentWeather.wind.strength += getRandomInt(-2, 1);
            } else if (localData.currentWeather.wind.strength < 12) {
                localData.currentWeather.wind.strength += getRandomInt(-3, 1);
            } else {
                localData.currentWeather.wind.strength += getRandomInt(-3, 0);
            }
        }

        let tempDisplay = this.generateTempDisp();

        return {
            wind: localData.currentWeather.wind,
            windDisplay: localData.currentWeather.wind.strength + " " + this.WINDS[localData.currentWeather.wind.direction],
            temperature: localData.currentWeather.temperature,
            tempDisp: tempDisplay,
            conditions: localData.currentWeather.conditions,
            display: localData.generateWeather
        }
    }

    generateTemperature() {
        let month = localData.calendarDate.getUTCMonth();
        let avgTemp = this.TEMP_AVG[month];
        let currentTemp = avgTemp + getRandomInt(-5, 5);
        let hour = localData.calendarDate.getUTCHours();
        let mod;

        if (hour < 4) {
            mod = -10;
        } else if (hour < 6) {
            mod = -5;
        } else if (hour < 12) {
            mod = 0;
        } else if (hour < 16) {
            mod = 5;
        } else if (hour < 19) {
            mod = 0;
        } else {
            mod = -5;
        }
        return currentTemp + mod;
    }

    generateTempDisp() {
        let temp = localData.currentWeather.temperature;

        if (temp < -10) {
            return {desc: "freezing (---)", color: "#0040FF" };
        } else if (temp < 0) {
            return {desc: "cold (--)", color: "#0080FF" };
        } else if (temp < 10) {
            return {desc: "chill (-)", color: "#00FFFF" };
        } else if (temp < 15) {
            return {desc: "cool (+)", color: "#80FFFF" };
        } else if (temp < 20) {
            return {desc: "warm (++)", color: "#FF8000" };
        } else {
            return {desc: "hot (+++)", color: "#FF0000" };
        }
    }

    updateDisplay() {
        let dateElement = document.getElementById("calendar-date");
        let timeElement = document.getElementById("calendar-time");
        let currentDate = this.generateTimeData();

        dateElement.innerHTML = currentDate.day + "-" +
            currentDate.month + "-" +
            currentDate.year + " (" +
            currentDate.weekday + ")";

        timeElement.innerHTML = currentDate.hour + ":" +
            currentDate.minute;

        if (localData.generateWeather) {
            let windDisplay = localData.currentWeather.wind.strength + " " + this.WINDS[localData.currentWeather.wind.direction];
            let tempDisplay = this.generateTempDisp();

            let windElement = document.getElementById("calendar-wind");
            let tempElement = document.getElementById("calendar-temp");
            let weatherElement = document.getElementById("calendar-weather");
            windElement.innerHTML = windDisplay;
            tempElement.style.color = tempDisplay.color;
            tempElement.innerHTML = tempDisplay.desc;
            weatherElement.innerHTML = localData.currentWeather.conditions;
        }
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
            if (localData.generateWeather) {
                this.generateWeatherDaily();
            }
        }
        localData.partyResources.forEach((res) => {
            res.value -= res.usePerHour * calModifier;
            res.value -= res.usePerDay * dailyUsage;
            if (res.value <= 0 && (res.usePerHour > 0 || (res.usePerDay > 0 && dailyUsage > 0))) {
                ui.notifications.error("WARNING! Out of resource: " + res.name + "!");
                res.value = 0;
            }
        });

        if (localData.generateWeather) {
            this.generateTempAndWind(true);
            await updateDataInSettings("currentWeather", localData.currentWeather);
        }

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