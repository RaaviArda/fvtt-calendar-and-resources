Hooks.on('init', () => {
    game.settings.register("calendar-and-resources", "calendarDate", {
        name: "Current date",
        hint: "Current date in YYYY-MM-DDT:HH:mm:ssZ format",
        scope: "world",
        config: true,
        default: DEFAULT.calendarDate,
        type: String,
        onChange: async (value) => await updateLocalData("calendarDate", value)
    });

    game.settings.register("calendar-and-resources", "calendarYearAdjust", {
        name: "Display year adjustment",
        hint: "Can be used to display years prior to 1970",
        scope: "world",
        config: true,
        default: 0,
        type: Number,
        onChange: async (value) => await updateLocalData("calendarYearAdjust", value)
    });

    game.settings.register("calendar-and-resources", "partyResources", {
        name: "partyResources",
        hint: "partyResources",
        scope: "world",
        config: false,
        default: DEFAULT.partyResources,
        type: Object,
        onChange: async (value) => await updateLocalData("partyResources", value)
    });
});

async function updateLocalData(type, value) {
    if (type === "calendarDate") {
        localData[type] = new Date(value);
        calDisp.updateDisplay();
    } else if (type === "calendarYearAdjust") {
        localData[type] = parseInt(value);
        calDisp.updateDisplay();
    } else if (type === "partyResources") {
        localData[type] = value;
        resDisp.updateDisplay();
    }
}

Hooks.once("ready", async () => {
    await loadData();

    resDisp = new Resources();
    resDisp.isOpen = false;
    resDisp.loadSettings();
    await resDisp.toggleResources();

    calDisp = new Calendar();
    calDisp.isOpen = false;
    calDisp.loadSettings();
    await calDisp.toggleCalendar();
});

Hooks.on('renderResources', async () => {
    resDisp.updateDisplay();
});

Hooks.on('renderCalendar', () => {
    calDisp.updateDisplay();
});

const localData = {};

var resDisp;
var calDisp;

const DEFAULT = {};
DEFAULT.partyResources = [{name: "Sample", value: 0, max: 0, usePerHour: 0, usePerDay: 0, unit: "G", color: "FFFFFF"}];
DEFAULT.calendarDate = "2185-05-04T22:00:00Z";
DEFAULT.calendarYearAdjust = 0;


async function updateDataInSettings(type, data) {
    let contents = game.settings.get("calendar-and-resources", type);
    let oldData = "";
    if (contents !== undefined) {
        oldData = JSON.parse(JSON.stringify(contents));
    }
    if (contents === undefined || oldData !== data) {
        await game.settings.set("calendar-and-resources", type, data);
    }
}

async function getDataFromSettings(type) {
    if (game.settings.get("calendar-and-resources", type) === undefined || game.settings.get("calendar-and-resources", type) === null) {
        await game.settings.set("calendar-and-resources", type, DEFAULT[type]);
        return JSON.parse(JSON.stringify(DEFAULT[type]));
    }
    return JSON.parse(JSON.stringify(game.settings.get("calendar-and-resources", type)));
}

async function loadData() {
    localData.partyResources =              await getDataFromSettings("partyResources");
    localData.calendarDate =       new Date(await getDataFromSettings("calendarDate"));
    localData.calendarYearAdjust = parseInt(await getDataFromSettings("calendarYearAdjust"));
}