class Resources extends Application {
    isOpen = false;
    content = "";

    static get defaultOptions() {
        const options = super.defaultOptions;
        if (game.user.isGM) {
            options.template = "modules/calendar-and-resources/templates/resources-gm.html";
        } else {
            options.template = "modules/calendar-and-resources/templates/resources-user.html";
        }
        options.popOut = false;
        options.resizable = false;
        return options;
    }

    setPos(pos) {
        return new Promise(resolve => {
            function check() {
                let elmnt = document.getElementById("resources-disp-container");
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
        let flag = game.user.getFlag('calendar-and-resources', 'resourcesDisplay');
        if (flag !== undefined && flag !== null) {
            let pos = flag.resourcesPos;
            this.setPos(pos);
        }
    }

    resetPos() {
        let pos = {bottom: 8, left: 15}
        return new Promise(resolve => {
            function check() {
                let elmnt = document.getElementById("resources-disp-container");
                if (elmnt) {
                    console.log('resources-display | Resetting Resources Display Position');
                    elmnt.style.top = null;
                    elmnt.style.bottom = (pos.bottom) + "%";
                    elmnt.style.left = (pos.left) + "%";
                    let pos = {top: elmnt.offsetTop, left: elmnt.offsetLeft};
                    game.user.update({flags: {'calendar-and-resources': {'resourcesDisplay': {'resourcesPos': pos}}}});
                    elmnt.style.bottom = null;
                    resolve();
                } else {
                    setTimeout(check, 30);
                }
            }

            check();
        })
    }

    getData(options) {
        return options;
    }

    async toggleResources() {
        console.log('resources-display | Toggling Resources Display.');
        let templatePath = "modules/calendar-and-resources/templates/resources-user.html";
        if (game.user.isGM) {
            templatePath = "modules/calendar-and-resources/templates/resources-gm.html";
        }
        if (this.isOpen) {
            this.isOpen = false;
            await this.close();
        } else {
            this.isOpen = true;
            this.content = await renderTemplate(templatePath, { resources: localData.partyResources});
            this.options.renderData = { resources: localData.partyResources};
            await this.render(true, {resources: localData.partyResources});
        }
    }

    updateDisplay() {
        localData.partyResources.forEach((res, i) => {
            let resDisp = document.getElementById("resources-" + i);
            resDisp.innerHTML = parseInt(res.value).toLocaleString('ru-RU') + " / " +
                                parseInt(res.max).toLocaleString('ru-RU') + " (-" +
                                parseInt(res.usePerHour).toLocaleString('ru-RU') + "/H, -" +
                                parseInt(res.usePerDay).toLocaleString('ru-RU')+ "/D) " +
                                res.unit;
            resDisp.style.color="#" + res.color;
            let nameDisp = document.getElementById("resources-name-" + i);
            nameDisp.innerHTML = res.name;
            nameDisp.style.color="#" + res.color;
        });
    }

    async createModifyDialog(type, data) {
        let updateRes = false;
        let dialogContent = await renderTemplate("modules/calendar-and-resources/templates/resource-mod-dialog.html", {resource: data, resourceName: type});

        new Dialog({
            title: `Modify resource: ` + type,
            content: dialogContent,
            buttons: {
                yes: {
                    icon: "<i class='fas fa-check'></i>",
                    label: "Update",
                    callback: () => (updateRes = true),
                },
                no: {
                    icon: "<i class='fas fa-times'></i>",
                    label: "Cancel",
                    callback: () => (updateRes = false),
                }
            },
            default: "yes",
            close: async (html) => {
                if (updateRes) {
                    await this.updateResources(type, html);
                    this.updateDisplay();
                }
            },
        }).render(true);
    }

    async createDeleteDialog(id) {
        let deleteResource = false;
        let dialogContent = await renderTemplate("modules/calendar-and-resources/templates/resource-del-dialog.html", {});

        new Dialog({
            title: `Delete resource: ` + localData.partyResources[id].name,
            content: dialogContent,
            buttons: {
                yes: {
                    icon: "<i class='fas fa-check'></i>",
                    label: "Delete",
                    callback: () => (deleteResource = true),
                },
                no: {
                    icon: "<i class='fas fa-times'></i>",
                    label: "Cancel",
                    callback: () => (deleteResource = false),
                }
            },
            default: "yes",
            close: async () => {
                if (deleteResource) {
                    localData.partyResources.splice(id, 1);
                    await this.render(true, {resources: localData.partyResources});
                    await updateDataInSettings("partyResources", localData.partyResources);
                }
            },
        }).render(true);
    }

    async createAddDialog() {
        let addRes = false;
        let blankRes = {name: "New Resource", value: 0, max: 0, usePerHour: 0, usePerDay: 0, unit: "U"};
        let dialogContent = await renderTemplate("modules/calendar-and-resources/templates/resource-mod-dialog.html", {resource: blankRes, resourceName: "New"});

        new Dialog({
            title: "Add new resource",
            content: dialogContent,
            buttons: {
                yes: {
                    icon: "<i class='fas fa-check'></i>",
                    label: "Add",
                    callback: () => (addRes = true),
                },
                no: {
                    icon: "<i class='fas fa-times'></i>",
                    label: "Cancel",
                    callback: () => (addRes = false),
                }
            },
            default: "yes",
            close: async (html) => {
                if (addRes) {
                    await this.addResource(html);
                }
            },
        }).render(true);
    }

    async addResource(html) {
        let newName = html.find('[id=resource-name]')[0].value;
        let newValue = parseInt(html.find('[id=resource-value]')[0].value);
        let newMax = parseInt(html.find('[id=resource-max]')[0].value);
        let newPerHour = parseInt(html.find('[id=resource-perhour]')[0].value);
        let newPerDay = parseInt(html.find('[id=resource-perday]')[0].value);
        let newUnit = html.find('[id=resource-unit]')[0].value;
        let newColor = html.find('[id=resource-color]')[0].value;

        localData.partyResources.push({
            name: newName,
            value: newValue,
            max: newMax,
            usePerHour: newPerHour,
            usePerDay: newPerDay,
            unit: newUnit,
            color: newColor
        });
        await this.render(true, {resources: localData.partyResources});
        await updateDataInSettings("partyResources", localData.partyResources);
    }

    async updateResources(type, html) {
        let newName = html.find('[id=resource-name]')[0].value;
        let newValue = parseInt(html.find('[id=resource-value]')[0].value);
        let newMax = parseInt(html.find('[id=resource-max]')[0].value);
        let newPerHour = parseInt(html.find('[id=resource-perhour]')[0].value);
        let newPerDay = parseInt(html.find('[id=resource-perday]')[0].value);
        let newUnit = html.find('[id=resource-unit]')[0].value;
        let newColor = html.find('[id=resource-color]')[0].value;

        localData.partyResources[type].name = newName;
        localData.partyResources[type].value = newValue;
        localData.partyResources[type].max = newMax;
        localData.partyResources[type].usePerDay = newPerDay;
        localData.partyResources[type].usePerHour = newPerHour;
        localData.partyResources[type].unit = newUnit;
        localData.partyResources[type].color = newColor;
        await updateDataInSettings("partyResources", localData.partyResources);
    }

    activateListeners(html) {
        const displays = '.resDisp';
        const deleteBtns = '.resources-delete';
        const addBtn = '[id=resources-add]';
        const resourcesMove = '#resources-move';

        if (game.user.isGM) {
            html.find(displays).click(async ev => {
                ev.preventDefault();
                let resId = parseInt(ev.target.dataset.resid);
                if (resId !== undefined && resId !== null) {
                    await this.createModifyDialog(resId, localData.partyResources[resId]);
                }
            });

            html.find(deleteBtns).click(async ev => {
                ev.preventDefault();
                let resId = parseInt(ev.target.dataset.resid);
                if (resId !== undefined && resId !== null) {
                    await this.createDeleteDialog(resId);
                }
            });

            html.find(addBtn).click(async ev => {
                ev.preventDefault();
                await this.createAddDialog();
            });
        }

        html.find(resourcesMove).mousedown(async ev => {
            ev.preventDefault();
            ev = ev || window.event;
            let isRightMB = false;
            if ("which" in ev) { // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
                isRightMB = ev.which === 3;
            } else if ("button" in ev) { // IE, Opera
                isRightMB = ev.button === 2;
            }

            if (!isRightMB) {
                dragElement(document.getElementById("resources-disp-container"));
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
                        game.user.update({flags: {'calendar-and-resources': {'resourcesDisplay': {'resourcesPos': pos}}}});
                    }
                }
            } else if (isRightMB) {
                await this.resetPos();
            }
        });
    }
}