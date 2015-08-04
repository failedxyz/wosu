String.prototype.startsWith = function(str) {
    return this.slice(0, str.length) == str;
}

String.prototype.endsWith = function(str) {
    return this.slice(-str.length) == str;
}

var $$ = function(id) {
    return document.getElementById(id);
}

WOsu = function() {}

WOsu.prototype.contructor = WOsu;

// Epsilon value
WOsu.EPSILON = 1e-4;

// Default Beatmap API location
WOsu.API = "http://sc-wu.com:9678";

/*
    Asynchronously call a function.
 */
WOsu.async = function(func, t) {
    setTimeout(func, t || 5);
}

/*
    Asynchronously call multiple functions with a callback when all functions finish.
    The first parameter is the calling instance. The second parameter is an array of functions
    and arguments. The third parameter is the final callback when all functions are finished.
 */
WOsu.resync = function(instance, funcs, callback) {
    var count = 0;
    var total = funcs.length;
    var finish = function() {
        count++;
        if (count >= total) {
            callback();
        }
    };
    
    funcs.forEach(function(o) {
        o.args = o.args || [];
        WOsu.async(function() {
            o.args.unshift(finish);
            o.fn.apply(instance, o.args);
        });
    });
}

WOsu.Beatmap = function () {
    this.BeatmapData = new WOsu.BeatmapData();
    this.BeatmapEvents = new WOsu.BeatmapEvents();
    this.BeatmapObjects = new WOsu.BeatmapObjects();
    this.BeatmapMechanics = new WOsu.BeatmapMechanics();
}

WOsu.Beatmap.prototype.constructor = WOsu.Beatmap;

WOsu.Beatmap.mods = {
    NoFail: {
        mask: 1 << 0,
        multiplier: 0.5
    },
    Easy: {
        mask: 1 << 1,
        multiplier: 0.5
    },
    NoVideo: {
        mask: 1 << 2,
        multiplier: 1.0
    },
    Hidden: {
        mask: 1 << 3,
        multiplier: 1.06
    },
    HardRock: {
        mask: 1 << 4,
        multiplier: 1.06
    },
    SuddenDeath: {
        mask: 1 << 5,
        multiplier: 1.0
    },
    DoubleTime: {
        mask: 1 << 6,
        multiplier: 1.12
    },
    Relax: {
        mask: 1 << 7,
        multiplier: 0.0
    },
    HalfTime: {
        mask: 1 << 8,
        multiplier: 0.3
    },
    Nightcore: {
        mask: 1 << 9,
        multiplier: 1.12
    },
    Flashlight: {
        mask: 1 << 10,
        multiplier: 1.12
    },
    Autoplay: {
        mask: 1 << 11,
        multiplier: 0.0
    },
    SpunOut: {
        mask: 1 << 12,
        multiplier: 0.9
    },
    Autopilot: {
        mask: 1 << 13,
        multiplier: 0.0
    },
    Perfect: {
        mask: 1 << 14,
        multiplier: 1.0
    },
    // TODO Multipliers for keys
    Key4: {
        mask: 1 << 15,
        multiplier: 1.0
    },
    Key5: {
        mask: 1 << 16,
        multiplier: 1.0
    },
    Key6: {
        mask: 1 << 17,
        multiplier: 1.0
    },
    Key7: {
        mask: 1 << 18,
        multiplier: 1.0
    },
    Key8: {
        mask: 1 << 19,
        multiplier: 1.0
    },
    FadeIn: {
        mask: 1 << 20,
        multiplier: 1.0
    },
    Random: {
        mask: 1 << 21,
        multiplier: 1.0
    },
    Cinema: {
        mask: 1 << 22,
        multiplier: 1.0
    },
    Key9: {
        mask: 1 << 23,
        multiplier: 1.0
    },
    Key10: {
        mask: 1 << 24,
        multiplier: 1.0
    },
    Key1: {
        mask: 1 << 25,
        multiplier: 1.0
    },
    Key3: {
        mask: 1 << 26,
        multiplier: 1.0
    },
    Key2: {
        mask: 1 << 27,
        multiplier: 1.0
    }
};

WOsu.Beatmap.hasMod = function (mods, mod) {
    return (mods & mod.mask) == mod.mask;
};

/**
    Get the timing point at a given time.
*/
WOsu.Beatmap.prototype.getTimingPoint = function (time) {
    var current = 0;
    var points = this.BeatmapEvents.TimingPoints;
    while (current < points.length - 1 && points[current + 1].time <= time) {
        current++;
    }
    return points[current];
}

/**
    Compute technical details of the beatmap (with mods).
*/
WOsu.Beatmap.prototype.loadMechanics = function (mods) {
    mods = (mods === undefined) ? 0 : mods;

    var bm = this.BeatmapMechanics;
    var bd = this.BeatmapData;

    // Apply mods
    var ar = bd.ApproachRate;
    var cs = bd.CircleSize;
    var od = bd.OverallDifficulty;
    var hp = bd.HPDrainRate;

    // Compute total difficulty
    bm.difficulty = cs + od + hp;
    bm.difficultyMultiplier = [6, 13, 18, 25, 31].reduce(function (p, c) {
        return (bm.difficulty > c) ? p + 1 : p;
    }, 2);

    // Compute mod multipliers
    for (var mod in WOsu.Beatmap.mods) {
        if (WOsu.Beatmap.hasMod(mods, mod)) {
            bm.modMultiplier *= mod.multiplier;
        }
    }

    // Adjust difficulty for mods
    if (WOsu.Beatmap.hasMod(mods, WOsu.Beatmap.mods.HardRock)) {
        ar = ar * 1.4;
        od = od * 1.4;
        if (ar > 10) {
            ar = 10;
        }
        if (od > 10) {
            od = 10;
        }
    }
    else if (WOsu.Beatmap.hasMod(mods, WOsu.Beatmap.mods.Easy)) {
        ar = ar * 0.5;
    }

    bm.AR = (ar <= 5) ? 1800 - ar * 120 : 1200 - (ar - 5) * 150;
    bm.CS = (140 - 15 * cs) / 2.0;
    bm.OD = 200 - od * 10;
    bm.hit300 = 80 - od * 6;
    bm.hit100 = 140 - od * 8;
    bm.hit50 = 200 - od * 10;

    var be = this.BeatmapEvents;
    bm.minBPM = -1;
    bm.maxBPM = -1;
    for (var i = 0; i < be.TimingPoints.length; i++) {
        var tp = be.TimingPoints[i];
        if (!tp.inherited) {
            if (bm.minBPM == -1 || tp.bpm > bm.minBPM) {
                bm.minBPM = tp.bpm;
            }
            if (bm.maxBPM == -1 || tp.bpm < bm.maxBPM) {
                bm.maxBPM = tp.bpm;
            }
        }
    }
    bm.minBPM = 60000 / bm.minBPM;
    bm.maxBPM = 60000 / bm.maxBPM;

    // TODO Check skin colors
    bm.colors = [
        [0xFF, 0x80, 0x80],
        [0x80, 0xFF, 0x00],
        [0x00, 0x80, 0xC0],
        [0xFF, 0xFF, 0x80]
    ];
}

/**
    Compute all game events.
*/
WOsu.Beatmap.prototype.loadEvents = function () {
    var bm = this.BeatmapMechanics;
    var bo = this.BeatmapObjects;

    for (var i = 0; i < bo.length; i++) {
        bm.events = bm.events.concat(WOsu.GameEvent.getEvents(bo[i]));
    }

    // Sort events in order
    bm.events.sort(function (a, b) {
        return a.time - b.time;
    });
}

WOsu.BeatmapLoader = {};

WOsu.BeatmapLoader.sectionKeys = [
    "HEADING",
    "GENERAL",
    "EDITOR",
    "METADATA",
    "DIFFICULTY",
    "EVENTS",
    "TIMINGPOINTS",
    "COLOURS",
    "HITOBJECTS",
];

WOsu.BeatmapLoader.stringKeys = [
    "AudioFilename", "SampleSet",

    "Title", "Artist", "Creator", "Version", "Source", "Tags",

];
WOsu.BeatmapLoader.arrayKeys = [

    "EditorBookmarks",


];
WOsu.BeatmapLoader.floatKeys = [
    "StackLeniency",


    "SliderMultiplier", "SliderTickRate",
];
WOsu.BeatmapLoader.integerKeys = [
    "AudioLeadIn", "PreviewTime", "Mode",
    "BeatDivisor", "GridSize",

    "HPDrainRate", "CircleSize", "OverallDifficulty", "ApproachRate",
];
WOsu.BeatmapLoader.booleanKeys = [
    "Countdown", "LetterboxInBreaks", "StoryFireInFront",
    "DistanceSnap",


];

WOsu.BeatmapLoader.isStringKey = function(key) {
    return WOsu.BeatmapLoader.stringKeys.indexOf(key) >= 0;
}

WOsu.BeatmapLoader.isArrayKey = function(key) {
    return WOsu.BeatmapLoader.arrayKeys.indexOf(key) >= 0;
}

WOsu.BeatmapLoader.isFloatKey = function(key) {
    return WOsu.BeatmapLoader.floatKeys.indexOf(key) >= 0;
}

WOsu.BeatmapLoader.isIntegerKey = function(key) {
    return WOsu.BeatmapLoader.integerKeys.indexOf(key) >= 0;
}

WOsu.BeatmapLoader.isBooleanKey = function(key) {
    return WOsu.BeatmapLoader.booleanKeys.indexOf(key) >= 0;
}

WOsu.BeatmapLoader.setKey = function(obj, key, value) {
    if (WOsu.BeatmapLoader.isStringKey(key)) {
        obj[key] = value;
    } else if (WOsu.BeatmapLoader.isArrayKey(key)) {
        obj[key] = value.split(",");
    } else if (WOsu.BeatmapLoader.isFloatKey(key)) {
        obj[key] = parseFloat(value);
    } else if (WOsu.BeatmapLoader.isIntegerKey(key)) {
        obj[key] = parseInt(value);
    } else if (WOsu.BeatmapLoader.isBooleanKey(key)) {
        obj[key] = (value == "true" || value == "1") ? true : false;
    }
}

WOsu.BeatmapLoader.eventLayerTypes = [
    "Background",
    "Break",
    "Storyboard Layer 0",
    "Storyboard Layer 1",
    "Storyboard Layer 2",
    "Storyboard Layer 3",
    "Storyboard Sound",
    "Background Colour",
];
WOsu.BeatmapLoader.getEventLayerType = function(key) {
    for (var i = 0; i < this.eventLayerTypes.length; i++) {
        if (key.indexOf(this.eventLayerTypes[i]) == 0) return i;
    }
    return -1;
}

WOsu.BeatmapLoader.load = function(text) {
    var Loader = WOsu.BeatmapLoader;

    var map = new WOsu.Beatmap();
    var mapData = map.BeatmapData;
    var mapEvents = map.BeatmapEvents;
    var mapObjects = map.BeatmapObjects;
    var mapMechanics = map.BeatmapMechanics;

    var lines = text.split("\n");

    var index = 0;
    var section = "HEADING";
    var key, value;
    var place = -1;
    var link = 0;
    var line;
    while (index < lines.length) {
        line = lines[index++].replace(/\n/g, "");
        if (line.trim().startsWith("[") && line.trim().endsWith("]")) {
            section = line.trim().substring(1, line.trim().length - 1).toUpperCase();
        } else if (line.trim() != "") {
            if (section == "HEADING") {
                mapData.head += line.trim() + "\n";
            } else if (section == "GENERAL") {
                line = line.trim();
                if (line.indexOf(":") > 0) {
                    key = line.substring(0, line.indexOf(":")).trim();
                    value = line.substring(line.indexOf(":") + 1).trim();
                    Loader.setKey(mapData, key, value);
                }
            } else if (section == "EDITOR") {
                line = line.trim();
                if (line.indexOf(":") > 0) {
                    key = line.substring(0, line.indexOf(":")).trim();
                    value = line.substring(line.indexOf(":") + 1).trim();
                    Loader.setKey(mapData, key, value);
                }
            } else if (section == "METADATA") {
                line = line.trim();
                if (line.indexOf(":") > 0) {
                    key = line.substring(0, line.indexOf(":")).trim();
                    value = line.substring(line.indexOf(":") + 1).trim();
                    Loader.setKey(mapData, key, value);
                }
            } else if (section == "DIFFICULTY") {
                line = line.trim();
                if (line.indexOf(":") > 0) {
                    key = line.substring(0, line.indexOf(":")).trim();
                    value = line.substring(line.indexOf(":") + 1).trim();
                    Loader.setKey(mapData, key, value);
                }
            } else if (section == "EVENTS") {
                if (line.startsWith("//")) {
                    place = Loader.getEventLayerType(line.substring(2));
                } else {
                    switch (place) {
                        case 0:
                            mapEvents.BackgroundEvents.push(new WOsu.BackgroundEvent(line));
                            break;
                        case 1:
                            mapEvents.BreakPeriods.push(new WOsu.BreakPeriod(line));
                            break;
                        case 2:
                            mapEvents.hasStoryboardBackground = true;
                        case 3:
                        case 4:
                        case 5:
                            if (line.startsWith(" ")) {
                                mapEvents.StoryboardObjects[map.BeatmapEvents.StoryboardObjects.length - 1].addCommand(line);
                            } else {
                                mapEvents.StoryboardObjects.push(new WOsu.StoryboardObject(line));
                            }
                            break;
                        case 6:
                        case 7:
                        default:
                            break;
                    }
                }
            } else if (section == "TIMINGPOINTS") {
                mapEvents.TimingPoints.push(new WOsu.TimingPoint(map, line));
            } else if (section == "COLOURS") {
                if (line.indexOf(":") > 0) {
                    value = line.substring(line.indexOf(":") + 1).trim().split(",");
                    mapEvents.Colours.push([parseInt(value[0]) / 255, parseInt(value[1]) / 255, parseInt(value[2]) / 255]);
                }
            } else if (section == "HITOBJECTS") {
                mapObjects.push(WOsu.HitObject.getObject(map, line));
            }
        }
    }

    return map;
}
WOsu.BeatmapData = function() {
	// Program variables
	this.head = "";
	this.AudioElement = null;
	this.BeatMapFileName = "";
	this.SongFileName = "";
	
	// General
	this.AudioFilename = "";
	this.AudioLeadIn = 0;
	this.PreviewTime = 0;
	this.Countdown = false;
	this.SampleSet = "";
	this.StackLeniency = 1;
	this.Mode = 0;
	this.LetterboxInBreaks = false;
	
	// Editor
	this.EditorBookmarks = null;
	this.DistanceSpacing = 1;
	this.BeatDivisor = 4;
	this.GridSize = 4;
	
	// Metadata
	this.Title = "";
	this.Artist = "";
	this.Creator = "";
	this.Version = "";
	this.Source = "";
	this.Tags = "";
	
	// Difficulty
	this.HPDrainRate = 5;
	this.CircleSize = 5;
	this.OverallDifficulty = 5;
	this.ApproachRate = 5;
	this.SliderMultiplier = 1;
	this.SliderTickRate = 1;
}

WOsu.BeatmapEvents = function() {
	// Events
	this.BackgroundEvents = [];
	this.BreakPeriods = [];
	this.StoryboardObjects = [];
	this.hasExternalStoryboard = false;
	this.hasStoryboardBackground = false;
	
	// Timing Points
	this.TimingPoints = [];
	
	// Colours
	this.Colours = [];
}

WOsu.BeatmapObjects = function() {
	Array.call(this);
}

WOsu.BeatmapObjects.prototype = Object.create( Array.prototype );

/**
    A structure containing technical mechanic values.
*/
WOsu.BeatmapMechanics = function() {
    // Difficulties in milliseconds
    this.AR = 0;
    this.CS = 0;
    this.OD = 0;
    this.hit300 = 0;
    this.hit100 = 0;
    this.hit50 = 0;
    
    // Total difficulty score multiplier
    this.difficulty = 0;
    this.difficultyMultiplier = 1;
    this.modMultiplier = 1;
    
    // Beats per minute (as opposed to milliseconds per beat)
    this.minBPM = 0;
    this.maxBPM = 1;
    
    // Combo colors
    this.colors = [];
    
    // Game hit events
    this.events = [];
}

WOsu.BeatmapMechanics.prototype.constructor = WOsu.BeatmapMechanics;
WOsu.Event = function(line) {
	this.parseParts = null;
	
	this.type = 0;
	this.time = 0;
	
	this.parse(line);
}

WOsu.Event.prototype.constructor = WOsu.Event;

WOsu.Event.prototype.parse = function(line) {
	this.parseParts = line.split(",");
	
	if (!isNaN(parseInt(this.parseParts[0]))) {
		this.type = parseInt(this.parseParts[0]);
		this.time = parseInt(this.parseParts[1]);
	}
	else {
		if (this.parseParts[0].startsWith("Video")) {
			this.type = WOsu.Event.TYPE_VIDEO;
			this.time = parseInt(this.parseParts[1]);
		}
		else if (this.parseParts[0].startsWith("Sprite")) {
			this.type = WOsu.Event.TYPE_SPRITE;
		}
		else if (this.parseParts[0].startsWith("Animation")) {
			this.type = WOsu.Event.TYPE_ANIMATION;
		}
	}
}

WOsu.Event.TYPE_BACKGROUND		= 0;
WOsu.Event.TYPE_VIDEO			= 1;
WOsu.Event.TYPE_BREAKPERIOD		= 2;
WOsu.Event.TYPE_COLORTRANSFORM	= 3;
WOsu.Event.TYPE_SPRITE			= 4;
WOsu.Event.TYPE_ANIMATION		= 5;

WOsu.BackgroundEvent = function(line) {
	WOsu.Event.call(this,line);
	
	this.media = "";
	
	this.parseBackgroundEvent(line);
}

WOsu.BackgroundEvent.prototype = Object.create( WOsu.Event.prototype );

WOsu.BackgroundEvent.prototype.parseBackgroundEvent = function(line) {
	this.parse(line);
	
	this.media = this.parseParts[2].replace(/\"/g,"").replace(/\\/g,"/");
}
WOsu.BreakPeriod = function(line) {
	WOsu.Event.call(this,line);
	
	this.endTime = 0;
	
	this.parseBreakPeriod(line);
}

WOsu.BreakPeriod.prototype = Object.create( WOsu.Event.prototype );

WOsu.BreakPeriod.prototype.parseBreakPeriod = function(line) {
	this.parse(line);
	
	this.endTime = parseInt(this.parseParts[2]);
}
WOsu.StoryboardEvent = function(line,link,comp) {
	this.parseParts = null;
	
	this.eventType = 0;
	this.compound = false;
	this.easing = 0;
	this.startTime = 0;
	this.endTime = 0;
	this.loopLink = -1;
	this.loopStartTime = -1;
	this.loopEndTime = -1;
	this.startX = 0;
	this.startY = 0;
	this.startZ = 0;
	this.endX = 0;
	this.endY = 0;
	this.endZ = 0;
	
	this.parseStoryboardEvent(line,link,comp);
}

WOsu.StoryboardEvent.prototype.constructor = WOsu.StoryboardEvent;

WOsu.StoryboardEvent.prototype.parseStoryboardEvent = function(line,link,comp) {
	this.parseParts = line.split(",");
	
	if (link!==undefined && link!=null) this.loopLink = link;
	if (comp!==undefined && comp!=null) this.compound = comp;
	
	if (this.parseParts[0]=="L") {
		this.eventType = WOsu.StoryboardEvent.TYPE_L;
		this.startTime = parseInt(this.parseParts[1]);
		this.loopStartTime = -1;
		this.loopEndTime = -1;
		this.startX = parseInt(this.parseParts[2]);
	}
	else if (this.parseParts[0]=="T") {
		this.eventType = WOsu.StoryboardEvent.TYPE_T;
	}
	else {
		this.easing = parseInt(this.parseParts[1]);
		this.startTime = parseInt(this.parseParts[2]);
		if (this.parseParts[3]=="") this.endTime = this.startTime;
		else this.endTime = parseInt(this.parseParts[3]);
		
		if (this.parseParts[0]=="F") {
			this.eventType = WOsu.StoryboardEvent.TYPE_F;
			this.startX = parseFloat(this.parseParts[4]);
			if (this.parseParts.length>5) {
				this.endX = parseFloat(this.parseParts[5]);
			}
			else {
				this.endX = this.startX;
			}
		}
		else if (this.parseParts[0]=="M") {
			this.eventType = WOsu.StoryboardEvent.TYPE_M;
			this.startX = parseInt(this.parseParts[4]);
			this.startY = parseInt(this.parseParts[5]);
			if (this.parseParts.length>6) {
				this.endX = parseInt(this.parseParts[6]);
				this.endY = parseInt(this.parseParts[7]);
			}
			else {
				this.endX = this.startX;
				this.endY = this.startY;
			}
		}
		else if (this.parseParts[0]=="MX") {
			this.eventType = WOsu.StoryboardEvent.TYPE_MX;
			this.startX = parseInt(this.parseParts[4]);
			if (this.parseParts.length>5) {
				this.endX = parseInt(this.parseParts[5]);
			}
			else {
				this.endX = this.startX;
			}
		}
		else if (this.parseParts[0]=="MY") {
			this.eventType = WOsu.StoryboardEvent.TYPE_MY;
			this.startY = parseInt(this.parseParts[4]);
			if (this.parseParts.length>5) {
				this.endY = parseInt(this.parseParts[5]);
			}
			else {
				this.endY = this.startY;
			}
		}
		else if (this.parseParts[0]=="S") {
			this.eventType = WOsu.StoryboardEvent.TYPE_S;
			this.startX = parseFloat(this.parseParts[4]);
			if (this.parseParts.length>5) {
				this.endX = parseFloat(this.parseParts[5]);
			}
			else {
				this.endX = this.startX;
			}
		}
		else if (this.parseParts[0]=="V") {
			this.eventType = WOsu.StoryboardEvent.TYPE_V;
			this.startX = parseFloat(this.parseParts[4]);
			this.startY = parseFloat(this.parseParts[5]);
			if (this.parseParts.length>6) {
				this.endX = parseFloat(this.parseParts[6]);
				this.endY = parseFloat(this.parseParts[7]);
			}
			else {
				this.endX = this.startX;
				this.endY = this.startY;
			}
		}
		else if (this.parseParts[0]=="R") {
			this.eventType = WOsu.StoryboardEvent.TYPE_R;
			this.startX = parseFloat(this.parseParts[4]);
			if (this.parseParts.length>5) {
				this.endX = parseFloat(this.parseParts[5]);
			}
			else {
				this.endX = this.startX;
			}
		}
		else if (this.parseParts[0]=="C") {
			this.eventType = WOsu.StoryboardEvent.TYPE_C;
			this.startX = parseInt(this.parseParts[4]);
			this.startY = parseInt(this.parseParts[5]);
			this.startZ = parseInt(this.parseParts[6]);
			if (this.parseParts.length>7) {
				this.endX = parseInt(this.parseParts[6]);
				this.endY = parseInt(this.parseParts[7]);
				this.endZ = parseInt(this.parseParts[8]);
			}
			else {
				this.endX = this.startX;
				this.endY = this.startY;
				this.endZ = this.startZ;
			}
		}
		else if (this.parseParts[0]=="P") {
			this.eventType = WOsu.StoryboardEvent.TYPE_P;
			if (this.parseParts[4][0]=="H") {
				this.startX = 0;
			}
			else if (this.parseParts[4][0]=="V") {
				this.startX = 1;
			}
			else if (this.parseParts[4][0]=="A") {
				this.startX = 2;
			}
		}
	}
}

WOsu.StoryboardEvent.prototype.isInstant = function() { return this.startTime==this.endTime; }

WOsu.StoryboardEvent.TYPE_F		= 0;
WOsu.StoryboardEvent.TYPE_M		= 1;
WOsu.StoryboardEvent.TYPE_MX	= 2;
WOsu.StoryboardEvent.TYPE_MY	= 3;
WOsu.StoryboardEvent.TYPE_S		= 4;
WOsu.StoryboardEvent.TYPE_V		= 5;
WOsu.StoryboardEvent.TYPE_R		= 6;
WOsu.StoryboardEvent.TYPE_C		= 7;
WOsu.StoryboardEvent.TYPE_P		= 8;
WOsu.StoryboardEvent.TYPE_L		= 9;
WOsu.StoryboardEvent.TYPE_T		= 10;
WOsu.StoryboardObject = function(line) {
	WOsu.Event.call(this,line);
	
	this.startTime = 0;
	this.endTime = 0;
	this.layer = 0;
	this.origin = 0;
	this.filePath = "";
	this.x = 0;
	this.y = 0;
	this.offsetX = 0;
	this.offsetY = 0;
	this.frameCount = 0;
	this.frameDelay = 0;
	this.loopType = 0;
	this.events = new Array(0);
	this.hasCompound = false;
	
	this.fade = 1;
	this.scaleX = 1;
	this.scaleY = 1;
	this.rotation = 0;
	this.r = 1;
	this.g = 1;
	this.b = 1;
	this.parameterH = false;
	this.parameterV = false;
	this.parameterA = false;
	
	this.parseStoryboardObject(line);
}

WOsu.StoryboardObject.prototype = Object.create( WOsu.Event.prototype );

WOsu.StoryboardObject.prototype.clone = function() {
	var original = this;
	clone = {};
	for (var i in original) {
		clone[i] = original[i];
	}
	return clone;
}

WOsu.StoryboardObject.prototype.parseStoryboardObject = function(line) {
	this.parse(line);
	
	if (this.parseParts[1]=="Background") {
		this.layer = 0;
	}
	else if (this.parseParts[1]=="Fail") {
		this.layer = 1;
	}
	else if (this.parseParts[1]=="Pass") {
		this.layer = 2;
	}
	else if (this.parseParts[1]=="Foreground") {
		this.layer = 3;
	}
	else {
		this.layer = parseInt(this.parseParts[1]);
		if (isNaN(this.layer)) this.layer = 0;
	}
	
	if (this.parseParts[2]=="TopLeft") {
		this.origin = 0;
	}
	else if (this.parseParts[2]=="TopCentre") {
		this.origin = 1;
	}
	else if (this.parseParts[2]=="TopRight") {
		this.origin = 2;
	}
	else if (this.parseParts[2]=="CentreLeft") {
		this.origin = 3;
	}
	else if (this.parseParts[2]=="Centre") {
		this.origin = 4;
	}
	else if (this.parseParts[2]=="CentreRight") {
		this.origin = 5;
	}
	else if (this.parseParts[2]=="BottomLeft") {
		this.origin = 6;
	}
	else if (this.parseParts[2]=="BottomCentre") {
		this.origin = 7;
	}
	else if (this.parseParts[2]=="BottomRight") {
		this.origin = 8;
	}
	else {
		this.origin = parseInt(this.parseParts[2]);
		if (isNaN(this.origin)) {
			this.origin = 0;
		}
	}
	
	this.filepath = this.parseParts[3].replace(/\"/g,"").replace(/\\/g,"/");
	this.x = parseInt(this.parseParts[4]);
	this.y = parseInt(this.parseParts[5]);
	
	if (this.type==WOsu.Event.TYPE_ANIMATION) {
		this.frameCount = parseInt(this.parseParts[6]);
		this.frameDelay = parseInt(this.parseParts[7]);
		if (this.parseParts[8]=="LoopForever") {
			this.loopType = 0;
		}
		else if (this.parseParts[8]=="LoopOnce") {
			this.loopType = 1;
		}
		else {
			this.loopType = parseInt(this.parseParts[8]);
			if (isNaN(this.loopType)) this.loopType = 1;
		}
	}
}

WOsu.StoryboardObject.prototype.isVisible = function(time) {
	if (time>this.endTime || time<this.startTime) return false;
	return true;
	
	/*
	var relativeTime;
	if (this.time>this.endTime) return false;
	for (var i=this.events.length-1; i>=0; i--) {
		if (!this.events[i].compound) {
			if (this.events[i].type==WOsu.StoryboardEvent.TYPE_L) {
				if (this.time>this.events[i].endTime) return false;
				else if (this.time>=this.events[i].startTime+this.events[i].loopStartTime) return true;
			}
			else {
				if (this.events[i].startTime<=this.time) {
					return true;
				}
			}
		}
	}
	return false;
	*/
}

WOsu.StoryboardObject.prototype.addCommand = function(line) {
	var event,newEvent;
	if (line.startsWith("  ")) {
		for (var i=this.events.length-1; i>=0; i--) {
			event = this.events[i];
			if (event.eventType==WOsu.StoryboardEvent.TYPE_L || event.eventType==WOsu.StoryboardEvent.TYPE_T) {
				this.hasCompound = true;
				newEvent = new WOsu.StoryboardEvent(line.substring(2),i,true);
				this.events.push(newEvent);
				event.endX = this.events.length-1;
				if (event.loopStartTime==-1 || newEvent.startTime<event.loopStartTime) {
					event.loopStartTime = newEvent.startTime;
				}
				if (event.loopEndTime==-1 || newEvent.endTime>event.loopEndTime) {
					event.loopEndTime = newEvent.endTime;
					event.endTime = event.startTime + event.loopStartTime + (newEvent.endTime-event.loopStartTime)*event.startX;
				}
				break;
			}
		}
	}
	else {
		this.events.push(new WOsu.StoryboardEvent(line.substring(1)));
	}
}

WOsu.StoryboardObject.prototype.getImageFile = function(n) {
	if (this.type==WOsu.Event.TYPE_SPRITE) {
		return this.filepath;
	}
	else if (this.type==WOsu.Event.TYPE_ANIMATION) {
		return this.filepath.substring(0,this.filepath.lastIndexOf(".")) + n + this.filepath.substring(this.filepath.lastIndexOf("."));
	}
	return this.filepath;
}

WOsu.StoryboardObject.prototype.getNumberImages = function() {
	if (this.type==WOsu.Event.TYPE_SPRITE) {
		return 1;
	}
	else if (this.type==WOsu.Event.TYPE_ANIMATION) {
		return this.frameCount;
	}
	return this.frameCount;
}

WOsu.TimingPoint = function (parent, line) {
    this.parseParts = null;

    this.map = parent;
    this.time = 0;
    this.bpm = 0; // This is actually like milliseconds per beat
    this.ratio = 1.0;
    // Removes the need to divide when calculating slider speeds.
    this.meter = 4;
    this.sampletype = 0;
    this.sampleset = 0;
    this.volume = 0;
    this.inherited = false;
    this.negativeBPM = false;
    this.ki = false;

    this.parse(line);
}

WOsu.TimingPoint.prototype.constructor = WOsu.TimingPoint;

WOsu.TimingPoint.prototype.parse = function (line) {
    this.parseParts = line.split(",");

    this.time = parseInt(this.parseParts[0]);
    this.bpm = parseFloat(this.parseParts[1]);
    this.meter = parseInt(this.parseParts[2]);
    this.sampletype = parseInt(this.parseParts[3]);
    this.sampleset = parseInt(this.parseParts[4]);
    this.volume = parseFloat(this.parseParts[5]);
    this.inherited = (this.parseParts[6] == "0") ? true : false;
    this.ki = (this.parseParts[7] == "0") ? true : false;

    if (this.bpm < 0) {
        this.negativeBPM = true;
        var tp = this.map.BeatmapEvents.TimingPoints;
        for (var i = tp.length - 1; i >= 0; i--) {
            if (!tp[i].negativeBPM && tp[i].time <= this.time) {
                this.ratio = -100.0 / this.bpm;
                this.bpm = -this.bpm / 100.0 * tp[i].bpm;
                break;
            }
        }
    }
}

WOsu.ColourEvent = function(line) {
	WOsu.Event.call(this,line);
	
	this.r = 255;
	this.g = 255;
	this.b = 255;
	
	this.parseColourEvent(line);
}

WOsu.ColourEvent.prototype = Object.create( WOsu.Event.prototype );

WOsu.ColourEvent.prototype.parseColourEvent = function(line) {
	this.parse(line);
	
	this.r = parseInt(this.parseParts[2]);
	this.g = parseInt(this.parseParts[3]);
	this.b = parseInt(this.parseParts[4]);
}
/**
    Handle game events and links multiple game events together.
*/
WOsu.GameEvent = function (type, time, x, y, gameObject, parent) {
    this.type = type;
    this.time = time;
    this.x = x;
    this.y = y;
    this.gameObject = gameObject;
    this.parent = (parent === undefined) ? this : parent;
    this.data = {};
}

WOsu.GameEvent.getEvents = function (obj) {
    var events = [];
    if (obj.isCircle()) {

        // Only one event for circles
        var parent = new WOsu.GameEvent(WOsu.GameEvent.TYPE_CIRCLE, obj.time, obj.x, obj.y, obj);
        events.push(parent);

    }
    else if (obj.isSlider()) {

        // Slider start
        var parent = new WOsu.GameEvent(WOsu.GameEvent.TYPE_SLIDER_START, obj.time, obj.x, obj.y, obj);
        events.push(parent);
        
        // Slider end
        events.push(new WOsu.GameEvent(WOsu.GameEvent.TYPE_SLIDER_END, obj.endTime, obj.endX, obj.endY, obj, parent));
        
        // Slider ticks
        var offsetTime = obj.time;
        for (var i = 0; i < obj.repeats; i++) {
            for (var j = 0; j < obj.ticks.length; j++) {
                // TODO Use slider.getPosition instead
                // Interpolation
                var t = obj.ticks[j];
                if (i % 2 == 0) {
                    t = 1.0 - t;
                }
                // Positional interpolation
                var ti = t * obj.curveLength;
                if (ti < 0) { // Clamp to the array size
                    ti = 0;
                }
                else if (ti >= obj.curveLength) {
                    ti = obj.curveLength - 1;
                }
                events.push(new WOsu.GameEvent(WOsu.GameEvent.TYPE_SLIDER_TICK, offsetTime + t * obj.curveTime, obj.curveX[ti], obj.curveY[ti], obj, parent));
            }
            offsetTime += obj.curveTime;
        }
        
        // Slider repeats
        offsetTime = obj.time;
        for (var i = 1; i < obj.repeats; i++) {
            offsetTime += obj.curveTime;
            
            // Repeat
            if (i % 2 == 0) { // Repeat at the beginning
                events.push(new WOsu.GameEvent(WOsu.GameEvent.TYPE_SLIDER_REPEAT, offsetTime, obj.x, obj.y, obj, parent));
            }
            else { // Repeat at the end
                events.push(new WOsu.GameEvent(WOsu.GameEvent.TYPE_SLIDER_REPEAT, offsetTime, obj.endX, obj.endY, obj, parent));
            }
        }

        // Whether or not the slider is held or not
        parent.data.hold = false;
        // Total combo points
        parent.data.hit = 0;
        parent.data.total = events.length;

    }
    else if (obj.isSpinner()) {

        // Spinner start
        var parent = new WOsu.GameEvent(WOsu.GameEvent.TYPE_SPINNER_START, obj.time, obj.x, obj.y, obj);
        events.push(parent);
        // Spinner end
        events.push(new WOsu.GameEvent(WOsu.GameEvent.TYPE_SPINNER_END, obj.endTime, obj.x, obj.y, obj, parent));
        
        parent.data.spins = 0;

    }
    return events;
}

WOsu.GameEvent.prototype.constructor = WOsu.GameEvent;

WOsu.GameEvent.prototype.isType = function (type) {
    return (this.type & type) == type;
}

WOsu.GameEvent.TYPE_NONE = 0;
WOsu.GameEvent.TYPE_CIRCLE = 1;

WOsu.GameEvent.TYPE_SLIDER = 2;
WOsu.GameEvent.TYPE_SLIDER_POINT = 2 + 4;
WOsu.GameEvent.TYPE_SLIDER_START = 2 + 4 + 8;
WOsu.GameEvent.TYPE_SLIDER_END = 2 + 4 + 16;
WOsu.GameEvent.TYPE_SLIDER_REPEAT = 2 + 4 + 32;
WOsu.GameEvent.TYPE_SLIDER_TICK = 2 + 64;

WOsu.GameEvent.TYPE_SPINNER = 128;
WOsu.GameEvent.TYPE_SPINNER_START = 128 + 256;
WOsu.GameEvent.TYPE_SPINNER_END = 128 + 512;

WOsu.HitObject = function(map, line) {
    this.parseParts = null;

    this.map = map;
    this.x = 0; // X coordinate (0-512)
    this.y = 0; // Y coordinate (0-392)
    this.endX = this.x;
    this.endY = this.y;
    this.time = 0; // Milliseconds after the beginning of the song
    this.endTime = 0;
    this.type; // Bit (3,2,1,0) -> (Spinner,New combo,Slider,Beat)
    this.combo = 0; // Combo color
    this.comboNumber = 1; // Combo number
    this.hitsound = 0; // Hit sound; Bit (3,2,1,0) -> (Clap,Finish,Whistle,Normal)

    this.parse(line);
}

WOsu.HitObject.getObject = function(map, line) {
    var t = new WOsu.HitObject(map, line);
    if (t.isCircle()) {
        t = new WOsu.CircleObject(map, line);
    } else if (t.isSlider()) {
        t = new WOsu.SliderObject(map, line);
    } else if (t.isSpinner()) {
        t = new WOsu.SpinnerObject(map, line);
    }
    return t;
}

WOsu.HitObject.prototype.constructor = WOsu.HitObject;

WOsu.HitObject.prototype.parse = function(line) {
    this.parseParts = line.split(",");
    this.x = parseInt(this.parseParts[0]);
    this.y = parseInt(this.parseParts[1]);
    this.time = parseInt(this.parseParts[2]);
    this.type = parseInt(this.parseParts[3]);
    this.hitsound = parseInt(this.parseParts[4]);

    this.endX = this.x;
    this.endY = this.y;
    this.endTime = this.time;
}

WOsu.HitObject.prototype.isCircle = function() {
    return (this.type & 1) == 1;
}

WOsu.HitObject.prototype.isSlider = function() {
    return (this.type & 2) == 2;
}

WOsu.HitObject.prototype.isComboChange = function() {
    return (this.type & 4) == 4;
}

WOsu.HitObject.prototype.isSpinner = function() {
    return (this.type & 8) == 8;
}
WOsu.CircleObject = function(map, line) {
    WOsu.HitObject.call(this, map, line);
}

WOsu.CircleObject.prototype = Object.create(WOsu.HitObject.prototype);
WOsu.SliderObject = function (map, line) {
    WOsu.HitObject.call(this, map, line);

    this.controlX = []; // Control X coordinates of the slider
    this.controlY = []; // Control Y coordinates of the slider
    this.repeats = 0; // Repeats
    this.curveX = []; // Generated curve point X coordinates
    this.curveY = []; // Generated curve point Y coordinates
    this.curveLength = 0; // Number of curve points
    this.sliderSpeed = 0; // Slider speed (osupixels)
    this.sliderLength = 0; // Slider length (pixels)
    this.sliderHitsounds = []; // Slider hit sounds
    this.endX = 0; // End X coordinate
    this.endY = 0; // End Y coordinate
    this.curveTime = 0; // Time for a single slide
    this.sliderTime = 0; // Time for the whole slider
    this.timingPoint = null; // The corresponding timing point
    this.ticks = []; // Slider ticks

    this.parseSliderObject(line);
}

WOsu.SliderObject.prototype = Object.create(WOsu.HitObject.prototype);

WOsu.SliderObject.prototype.parseSliderObject = function (line) {
    var points = this.parseParts[5].split("|");
    var lastX = this.x,
        lastY = this.y;
    var nextX, nextY;
    for (var i = 1; i < points.length; i++) {
        nextX = parseInt(points[i].substring(0, points[i].indexOf(":")));
        nextY = parseInt(points[i].substring(points[i].indexOf(":") + 1));

        this.controlX.push(nextX);
        this.controlY.push(nextY);

        this.sliderLength += Math.sqrt(Math.pow(nextX - lastX, 2) + Math.pow(nextY - lastY, 2));

        lastX = nextX;
        lastY = nextY;
    }
    this.controlX.unshift(this.x);
    this.controlY.unshift(this.y);

    this.repeats = parseInt(this.parseParts[6]);
    this.sliderSpeed = parseFloat(this.parseParts[7]);
    if (this.parseParts.length > 8) {
        points = this.parseParts[8].split("\\|");
        for (var i = 0; i < points.length; i++) {
            this.sliderHitsounds.push(parseInt(points[i]));
        }
    }

    this.endX = this.controlX[this.controlX.length - 1];
    this.endY = this.controlY[this.controlY.length - 1];

    // Slider timings
    var multiplier = this.map.BeatmapData.SliderMultiplier;
    this.timingPoint = this.map.getTimingPoint(this.time);
    this.curveTime = this.sliderSpeed / multiplier / 100 * this.timingPoint.bpm;
    this.endTime = this.curveTime * this.repeats + this.time;
    this.sliderTime = this.endTime - this.time;

    // Slider tick points
    var tickRate = this.map.BeatmapData.SliderTickRate;
    var frequency = (100.0 * this.timingPoint.ratio * multiplier) / (this.sliderSpeed * tickRate);
    for (var i = frequency; i < 1.0 - WOsu.EPSILON; i += frequency) {
        this.ticks.push(i);
    }
}

WOsu.SliderObject.prototype.generateBezier = function () {
    var max = ~~(this.sliderLength / 5);

    this.curveX = new Array(max + 1);
    this.curveY = new Array(max + 1);

    var t, degree, pointX, pointY;
    for (var i = 0; i <= max; i++) {
        t = i / max;
        pointX = this.controlX.slice(0);
        pointY = this.controlY.slice(0);
        degree = this.controlX.length;
        while (degree > 1) {
            for (var j = 0; j < degree - 1; j++) {
                pointX[j] = pointX[j] * (1 - t) + pointX[j + 1] * t;
                pointY[j] = pointY[j] * (1 - t) + pointY[j + 1] * t;
            }
            degree--;
        }
        this.curveX[i] = pointX[0];
        this.curveY[i] = pointY[0];
    }

    this.curveLength = this.curveX.length;
}

WOsu.SliderObject.prototype.getPosition = function (time) {
    var last = 0;
    var next = 0;
    var t = 0;
    if (time < this.time) {
        last = 0;
        next = last;
        t = 0;
    }
    else if (time > this.endTime) {
        last = this.curveLength - 1;
        next = last;
        t = 0;
    }
    else {
        var diff = time - this.time;
        var repeats = ~~(diff / this.curveTime);
        var partial = diff % this.curveTime;
        if (repeats % 2 == 1) {
            partial = 1.0 - partial;
        }
        last = ~~(partial * this.curveLength);
        next = last + 1;
        if (next >= this.curveLength) {
            next = last;
        }
        t = partial * this.curveLength - last;
    }

    return [ this.curveX[last] * (1 - t) + this.curveX[next] * t, this.curveY[last] * (1 - t) + this.curveY[next] * t ];
}

WOsu.SliderObject.prototype.getDistance = function (time, x, y) {
    var pos = this.getPosition(time);
    var dx = pos[0] - x;
    var dy = pos[1] - y;
    return Math.sqrt(dx * dx + dy * dy);
}

WOsu.SpinnerObject = function(map, line) {
    WOsu.HitObject.call(this, map, line);

    this.spinnerTime = 0; // Spinner time

    this.parseSpinnerObject(line);
}

WOsu.SpinnerObject.prototype = Object.create(WOsu.HitObject.prototype);

WOsu.SpinnerObject.prototype.parseSpinnerObject = function(line) {
    this.endTime = parseInt(this.parseParts[5]);
    this.spinnerTime = this.endTime - this.time;
}
/*
 * WOsu.Player
 *
 *
 */
WOsu.Player = function (options) {
    this.width = options.width || 640;
    this.height = options.height || 480;

    this.callback = {
        progress: options.progressCallback,
        completion: options.completionCallback,
        error: options.errorCallback
    };

    this.skin = null;
    this.replay = null;
    this.beatmap = null;
    this.game = null;

    this.elements = {
        audio: null,
        three: null
    };

    // Initialize Three.js
    this.initThree();
}

WOsu.Player.prototype.constructor = WOsu.Player;

WOsu.Player.prototype.initThree = function () {
    var instance = this;

    // New renderer, no sorting
    var renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x000000, 0.0);
    renderer.setSize(this.width, this.height);
    renderer.sortObjects = false;

    // Three.js Scene
    var scene = new THREE.Scene();

    // TODO Rendering target for layers
    var target = new THREE.WebGLRenderTarget(this.width, this.height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBFormat
    });

    // Allow cross origin loading (?)
    THREE.ImageUtils.crossOrigin = "";

    // Need to scale to at least 640 x 480 units
    var ratio = this.height / this.width;
    var camera;
    if (ratio > 0.75) { // Width limit
        camera = new THREE.OrthographicCamera(-320, 320, 320 * ratio, -320 * ratio, 1, 1e5);
    }
    else { // Height limit
        camera = new THREE.OrthographicCamera(-240 / ratio, 240 / ratio, 240, -240, 1, 1e5);
    }
    camera.position.set(0, 0, 2);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.three = {
        renderer: renderer,
        camera: camera,
        scene: scene,
        target: target
    };

    // TODO handle resizing

    this.elements.three = renderer.domElement;
}

WOsu.Player.prototype.load = function (options) {
    var instance = this;

    this.loaded = false;
    this.playing = false;

    this.api = WOsu.API;

    if (options.api && options.api.trim() != "") {
        this.api = options.api.trim();
    }
    if (this.api[this.api.length - 1] == "/") {
        this.api = this.api.substring(0, this.api.length - 1);
    }

    var layers = this.layers = options.layers || {
        storyboard: true,
        gameplay: false,
        replay: false,
        ui: false,
        stat: true
    };

    WOsu.resync(instance, [{ // Load skin
        fn: instance.loadSkin,
        args: [options.skin]
    }, { // Load replay
        fn: instance.loadReplay,
        args: [options.replay.type, options.replay.data]
    }], function () {
        instance.callback.progress("Replay", "Finished");

        // Load beatmap
        instance.loadBeatmap(function () {
            // Load gameplay variables
            instance.loadGameplay();

            WOsu.resync(instance, [{
                fn: instance.loadAudio,
                args: []
            }, {
                fn: instance.loadThree,
                args: []
            }], function () {
                instance.callback.completion();
            });
        });
    });

    // TODO Read storyboard
    // this.initStoryboard();
}

WOsu.Player.prototype.setProgressCallback = function (callback) {
    this.callback.progress = callback;
}

WOsu.Player.prototype.setCompletionCallback = function (callback) {
    this.callback.completion = callback;
}

WOsu.Player.prototype.setErrorCallback = function (callback) {
    this.callback.error = callback;
}

WOsu.Player.prototype.loadSkin = function (resyncFinish, loc) {
    var instance = this;

    // Progress callback for the skin loader
    var progress = function (loaded, total) {
        instance.callback.progress("Skin", loaded + " / " + total + " loaded");
        if (loaded == total) {
            instance.callback.progress("Skin", "Finished");
            resyncFinish();
        }
    };

    instance.skin = WOsu.SkinLoader.load(loc, progress);
}

WOsu.Player.prototype.loadReplay = function (resyncFinish, type, data) {
    var instance = this;
    this.callback.progress("Replay", "Loading replay");

    // When finished, parse the replay info and call the callback
    function localFinish(success) {
        instance.parseReplayInfo();
        resyncFinish();
    }

    // Failure
    function localError(message) {
        instance.callback.error("Replay", message);
    }

    if (type == "file") {
        var fd = new FormData();
        ORV.debug.data = data;
        console.log(data);
        fd.append("replayFile", data.files[0]);
        $.ajax({
            url: "lib/GetReplay.php",
            data: fd,
            cache: false,
            contentType: false,
            processData: false,
            type: "POST",
        }).done(function (data) {
            try {
                var error = JSON.parse(data);
                localError(error.message);
            }
            catch (e) {
                instance.parseRawReplay(data, localFinish);
            }
        }).fail(function (data) {
            localError("Failed to upload replay");
        });
    }
    else {
        $.ajax({
            url: instance.api + "/get/" + B64.encode(encodeURI(data)),
            contentType: false,
            processData: false,
            type: "GET",
        }).done(function (data) {
            if (!instance.parseJSONReplay(data, localFinish)) {
                try {
                    var error = JSON.parse(data);
                    localError(error.message);
                }
                catch (e) {
                    instance.parseRawReplay(data, localFinish);
                }
            }
        }).fail(function (data) {
            localError("Failed to retrieve replay");
        });
    }
}

/**
    Parse a replay in binary osr format
 */
WOsu.Player.prototype.parseRawReplay = function (bytedata, finish) {
    var instance = this;
    this.callback.progress("Replay", "Loading raw replay");

    function progress(percent) {
        instance.callback.progress("Replay", "Loading raw replay (" + percent + "%)");
    }

    this.replay = WOsu.ReplayLoader.loadRaw(bytedata, finish, progress);
}

/**
    Parse an pre-parsed replay in json format
 */
WOsu.Player.prototype.parseJSONReplay = function (data, finish) {
    var instance = this;
    this.callback.progress("Replay", "Loading JSON replay");

    try {
        this.replay = WOsu.ReplayLoader.loadJSON(JSON.parse(data));
        finish();

        return true;
    }
    catch (e) {
        return false;
    }
}

/**
    Parse replay information to proceed loading other resources
 */
WOsu.Player.prototype.parseReplayInfo = function () {
    var instance = this;
}

/**
    Load the beatmap from the API
    
    TODO Seperate from replay, load any beatmap by hash or name or whatever
*/
WOsu.Player.prototype.loadBeatmap = function (finish) {
    var instance = this;

    this.callback.progress("Beatmap", "Loading");

    function localFinish() {
        // TODO Transformations because of Easy/HR?
        // Hidden and Flashlight should go into the shaders
        // Technical calculations
        instance.beatmap.loadMechanics();
        // TODO Include mods
        //instance.beatmap.loadMechanics(this.replay.mods);
        // Create and sort game events
        instance.beatmap.loadEvents();

        instance.callback.progress("Beatmap", "Finished");
        finish();
    }

    // Make sure the replay is loaded and it contains a beatmap hash
    if (this.replay && this.replay.type == 0 && this.replay.bhash.length == 32) {
        // Get beatmap metadata
        $.ajax({
            url: instance.api + "/" + this.replay.bhash,
            type: "GET",
        }).done(function (data) {
            instance.metadata = data;

            // Get beatmap data
            $.ajax({
                url: instance.api + "/" + instance.replay.bhash + "/R",
                contentType: false,
                processData: false,
                type: "GET",
            }).done(function (data) {
                // Load the beatmap
                instance.beatmap = WOsu.BeatmapLoader.load(data);

                localFinish();
            }).fail(function (data) {
                // In case the data comes as a typical xhr request (?)
                if (typeof (data) == "object" && data.readyState == 4 && data.status == 200) {
                    instance.beatmap = WOsu.BeatmapLoader.load(data.responseText);

                    localFinish();
                }
                else {
                    instance.beatmap = new WOsu.Beatmap();
                    instance.callback.progress("Beatmap", "Failed");
                }
            });
        }).fail(function (data) {
            instance.callback.error("Beatmap", "Error retreiving metadata");
        });
    }
    else {
        instance.callback.error("Beatmap", "Invalid replay");
    }
}

/**
    Load gameplay variables
*/
WOsu.Player.prototype.loadGameplay = function () {
    this.game = {
        score: new WOsu.ScoreManager(this.beatmap.BeatmapMechanics),
        index: {
            eventIndex: 0,
            eventLength: this.beatmap.BeatmapMechanics.events.length,
            replayIndex: 0,
            replayEdge: 0,
            replayLength: this.replay.replayData.length
        },
        currentCircles: [],
        currentSliders: [],
        currentSpinners: []
    };
}

WOsu.Player.prototype.loadAudio = function (loadResync) {
    this.callback.progress("Audio", "Loading");

    var audioElement = document.createElement("audio");
    audioElement.preload = "auto";
    audioElement.volume = 0.3;
    audioElement.setAttribute("src", this.api + "/" + this.metadata.song + "/R/" + this.beatmap.BeatmapData.AudioFilename);
    audioElement.setAttribute("controls", "controls");
    this.elements.audio = this.audio = audioElement;

    this.callback.progress("Audio", "Finished");

    loadResync();
}

// FUTURE Eventually most code after this will be separated into
//        gamemode specific files, e.g. StandardPlayer, TaikoPlayer, etc.
// FUTURE For ctb player, figure out how random positions are seeded

WOsu.Player.prototype.loadThree = function (loadResync) {
    var instance = this;

    this.callback.progress("Three", "Loading objects");

    this.three.layers = {};

    this.three.materials = {};

    WOsu.resync(instance, [{
        fn: instance.loadThreeStoryboard
    }, {
        fn: instance.loadThreeGameplay
    }, {
        fn: instance.loadThreeReplay
    }, {
        fn: instance.loadThreeUI
    }, {
        fn: instance.loadThreeStatistics
    }], function () {
        // Finish up
        instance.loadThreeScene();

        instance.callback.progress("Three", "Finished");

        loadResync();
    });
}

/**
    Load Three.js elements for display the storyboard.
    
    // TODO loadThreeStoryboard
*/
WOsu.Player.prototype.loadThreeStoryboard = function (threeResync) {
    var storyboard = new THREE.Object3D();
    var bgpath = "";
    var bme = this.beatmap.BeatmapEvents.BackgroundEvents;
    for (var i = 0; i < bme.length; i++) {
        if (bme[i].type == WOsu.Event.TYPE_BACKGROUND) {
            bgpath = this.api + "/" + this.metadata.song + "/R/" + bme[i].media;
            break;
        }
    }

    if (bgpath != "") {
        var background = this.createThreeQuad({
            x: 0,
            y: 0,
            z: -1e4, // This goes in the very back
            width: 640,
            height: 480,
            color: new THREE.Vector4(0.5, 0.5, 0.5, 1.0),
            texture: THREE.ImageUtils.loadTexture(bgpath)
        });

        storyboard.background = background;
        storyboard.add(background);
    }

    this.three.layers.storyboard = {
        object: storyboard,
        properties: {}
    };

    threeResync();
}

/**
    Load Three.js elements for displaying the gameplay.
*/
WOsu.Player.prototype.loadThreeGameplay = function (threeResync) {
    // Hit objects
    var gameplay = new THREE.Object3D();
    var bme = this.beatmap.BeatmapEvents.BackgroundEvents;
    var bmo = this.beatmap.BeatmapObjects;
    var bmm = this.beatmap.BeatmapMechanics;
    var textures = this.skin.textures;

    var approachUniforms = {
        currentTime: {
            type: 'f',
            value: Number.NEGATIVE_INFINITY
        },
        approachRate: {
            type: 'f',
            value: bmm.AR
        },
        overallDifficulty: {
            type: 'f',
            value: bmm.OD
        },
        circleSize: {
            type: 'f',
            value: bmm.CS
        },

        approachcircle: {
            type: 't',
            value: textures.approachcircle
        }
    };
    var approachAttributes = {
        colorMask: {
            type: 'v4'
        },
        startTime: {
            type: 'f'
        },
        hitTime: {
            type: 'f'
        },
        center: {
            type: 'v2'
        }
    };
    var approachMaterial = new THREE.ShaderMaterial({
        uniforms: approachUniforms,
        attributes: approachAttributes,

        vertexShader: WOsu.Player.approachShader.vertexShader,
        fragmentShader: WOsu.Player.approachShader.fragmentShader,

        side: THREE.DoubleSide,
        transparent: true
    });

    var hitUniforms = {
        currentTime: {
            type: 'f',
            value: Number.NEGATIVE_INFINITY
        },
        approachRate: {
            type: 'f',
            value: bmm.AR
        },
        overallDifficulty: {
            type: 'f',
            value: bmm.OD
        },
        circleSize: {
            type: 'f',
            value: bmm.CS
        },

        hitcircle: {
            type: 't',
            value: textures.hitcircle
        },
        hitcircle_overlay: {
            type: 't',
            value: textures.hitcircle_overlay
        },
        digits: {
            type: 'tv',
            value: [
                textures.score_0,
                textures.score_1,
                textures.score_2,
                textures.score_3,
                textures.score_4,
                textures.score_5,
                textures.score_6,
                textures.score_7,
                textures.score_8,
                textures.score_9
            ]
        }
    };
    var hitAttributes = {
        colorMask: {
            type: 'v4'
        },
        startTime: {
            type: 'f'
        },
        endTime: {
            type: 'f'
        },
        hitTime: {
            type: 'f'
        },
        center: {
            type: 'v2'
        },
        hitType: {
            type: 'f'
        }
    };
    var hitMaterial = new THREE.ShaderMaterial({
        uniforms: hitUniforms,
        attributes: hitAttributes,

        vertexShader: WOsu.Player.hitShader.vertexShader,
        fragmentShader: WOsu.Player.hitShader.fragmentShader,

        side: THREE.DoubleSide,
        transparent: true
    });

    var spinnerUniforms = {
        currentTime: {
            type: 'f',
            value: Number.NEGATIVE_INFINITY
        },
        approachRate: {
            type: 'f',
            value: bmm.AR
        },
        overallDifficulty: {
            type: 'f',
            value: bmm.OD
        },
        circleSize: {
            type: 'f',
            value: bmm.CS
        },

        spinner_approachcircle: {
            type: 't',
            value: textures.spinner_approachcircle
        },
        spinner_background: {
            type: 't',
            value: textures.spinner_background
        },
        spinner_circle: {
            type: 't',
            value: textures.spinner_circle
        }
    };
    var spinnerAttributes = {
        startTime: {
            type: 'f'
        },
        endTime: {
            type: 'f'
        },
        spinAmount: {
            type: 'f'
        }
    };
    var spinnerMaterial = new THREE.ShaderMaterial({
        uniforms: spinnerUniforms,
        attributes: spinnerAttributes,

        vertexShader: WOsu.Player.spinnerShader.vertexShader,
        fragmentShader: WOsu.Player.spinnerShader.fragmentShader,

        side: THREE.DoubleSide,
        transparent: true
    });

    var comboColor = 0;
    var comboNumber = 1;
    var totalObjects = bmo.length;

    // Approach circles
    var approachAdd = [];
    // Hit circles and sliders
    var hitAdd = [];
    // Spinners
    var spinnerAdd = [];
    // TODO Follow points

    var meshes = [];
    for (var i = 0; i < totalObjects; i++) {
        var hitobj = bmo[i];

        if (hitobj.isComboChange()) {
            comboColor = (comboColor + 1) % bmm.colors.length;
            comboNumber = 1;
        }

        hitobj.combo = comboColor;
        hitobj.comboNumber = comboNumber;

        comboNumber++;

        // TODO Stacked notes offset (probably goes in BeatmapLoader)
        // Link meshes with corresponding hit objects
        var nextobj;
        if (hitobj.isCircle()) {

            nextobj = this.createThreeApproachCircle({
                material: approachMaterial,
                object: hitobj,
                z: -i / totalObjects - 1,
                mechanics: bmm
            });
            nextobj.gameObject = hitobj;
            approachAdd.push(nextobj);
            meshes.push(nextobj);

            nextobj = this.createThreeCircle({
                material: hitMaterial,
                object: hitobj,
                z: -i / totalObjects - 2,
                mechanics: bmm
            });
            nextobj.gameObject = hitobj;
            hitAdd.push(nextobj);
            meshes.push(nextobj);

        }
        else if (hitobj.isSlider()) {

            nextobj = this.createThreeApproachCircle({
                material: approachMaterial,
                object: hitobj,
                z: -i / totalObjects - 1,
                mechanics: bmm
            });
            nextobj.gameObject = hitobj;
            approachAdd.push(nextobj);
            meshes.push(nextobj);

            nextobj = this.createThreeSliderStart({
                material: hitMaterial,
                object: hitobj,
                z: -i / totalObjects - 2,
                mechanics: bmm
            });
            nextobj.gameObject = hitobj;
            hitAdd.push(nextobj);
            meshes.push(nextobj);

            nextobj = this.createThreeSliderEnd({
                material: hitMaterial,
                object: hitobj,
                z: -(i + 0.3) / totalObjects - 2,
                mechanics: bmm
            });
            nextobj.gameObject = hitobj;
            hitAdd.push(nextobj);
            meshes.push(nextobj);

            nextobj = this.createThreeSliderBody({
                material: hitMaterial,
                object: hitobj,
                z: -(i + 0.6) / totalObjects - 2,
                mechanics: bmm
            });
            nextobj.gameObject = hitobj;
            hitAdd.push(nextobj);
            meshes.push(nextobj);

        }
        else if (hitobj.isSpinner()) {

            nextobj = this.createThreeSpinner({
                material: spinnerMaterial,
                attributes: spinnerAttributes,
                object: hitobj,
                z: -i / totalObjects - 3, // Spinners go behind other objects
                mechanics: bmm
            });
            nextobj.gameObject = hitobj;
            spinnerAdd.push(nextobj);
            meshes.push(nextobj);

        }
    }

    // Spinners go behind objects
    for (var i = spinnerAdd.length - 1; i >= 0; i--) {
        gameplay.add(spinnerAdd[i]);
    }
    for (var i = hitAdd.length - 1; i >= 0; i--) {
        gameplay.add(hitAdd[i]);
    }
    // Approach circles go in front of everything
    for (var i = approachAdd.length - 1; i >= 0; i--) {
        gameplay.add(approachAdd[i]);
    }

    // Set all objects to be invisible, except ones within the approach rate at the start
    var index = 0;
    var threshold = bmm.AR * 2
    for (var i = 0; i < meshes.length; i++) {
        if (meshes[i].gameObject.time < threshold) {
            meshes[i].visible = true;
            if (i == index) {
                index++;
            }
        }
        else {
            meshes[i].visible = false;
        }
    }

    // Layer object
    this.three.layers.gameplay = {
        object: gameplay,
        properties: {
            // The conservative extent of visibility
            objectStart: 0,
            objectEnd: index,
            // An ordered list of all meshes
            objects: meshes,
            objectLength: meshes.length,
            // Materials
            approachMaterial: approachMaterial,
            hitMaterial: hitMaterial,
            spinnerMaterial: spinnerMaterial
        }
    };

    threeResync();
}

/**
    Load Three.js elements for displaying the replay.
    
    // TODO Same as loadThreeGameplay
*/
WOsu.Player.prototype.loadThreeReplay = function (threeResync) {
    var replay = new THREE.Object3D();
    var textures = this.skin.textures;

    var cursorMesh;
    if (this.layers.replay) {
        cursorMesh = this.createThreeCursor({
            x: 0,
            y: 0,
            z: 0
        });
    }
    else {
        cursorMesh = new THREE.Object3D();
    }

    replay.add(cursorMesh);

    this.three.layers.replay = {
        object: replay,
        properties: {
            cursorMesh: cursorMesh
        }
    };

    threeResync();
}

/**
    Load Three.js elements for displaying the UI.
    
    // TODO loadThreeUI
*/
WOsu.Player.prototype.loadThreeUI = function (threeResync) {
    var ui = new THREE.Object3D();

    this.three.layers.ui = {
        object: ui,
        properties: {}
    };

    threeResync();
}

/**
    Load Three.js elements for displaying statistical elements.
    
    // TODO loadThreeStatistics
*/
WOsu.Player.prototype.loadThreeStatistics = function (threeResync) {
    var stat = new THREE.Object3D();

    this.three.layers.stat = {
        object: stat,
        properties: {}
    };

    threeResync();
}

/**
    Assemble Three.js scene together. This is the last loading function called.
*/
WOsu.Player.prototype.loadThreeScene = function () {
    // Build scene
    var scene = this.three.scene;
    scene.add(this.three.camera);

    // Add layers to the scene
    var layers = this.three.layers;
    scene.add(layers.storyboard.object);
    scene.add(layers.gameplay.object);
    scene.add(layers.replay.object);
}


// Three.js creation

/**
    Shader for generic textured quads
*/
WOsu.Player.quadShader = {
    vertexShader: [
        "attribute vec4 colorMask;",

        "varying vec2 vUv;",
        "varying vec4 vColor;",

        "void main() {",
        "   vColor = colorMask;",
        "   vUv = uv;",
        "   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}"
    ].join("\n"),

    fragmentShader: [
        "uniform sampler2D texture;",

        "varying vec4 vColor;",
        "varying vec2 vUv;",

        "void main() {",
        "   gl_FragColor = texture2D(texture, vUv) * vColor;",
        "}"
    ].join("\n")
};

/**
    Shader for the mouse cursor
*/
WOsu.Player.cursorShader = {
    vertexShader: [
        "uniform float currentTime;",

        // Whether or not the cursor is hit or not
        "uniform int isHit;",
        // If the cursor is hit, then this is the time of the last hit
        // Otherwise, it is the time of last release
        "uniform float hitTime;",

        "varying vec2 vUv;",

        "void main() {",
        "   float diff = (currentTime - hitTime) / 50.0;",
        "   vec3 scaledPosition = position;",
        "   float factor = 1.0;",
        // Cursor has been hit (scaling up)
        "   if (isHit == 1) {",
        "       factor = 1.0 + clamp(diff, 0.0, 1.0) * 0.4;",
        "   }",
        // Cursor has been released (scaling down)
        "   else {",
        "       factor = 1.0 + (1.0 - clamp(diff, 0.0, 1.0)) * 0.4;",
        "   }",
        "   scaledPosition.x *= factor;",
        "   scaledPosition.y *= factor;",
        "   vUv = uv;",
        "   gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPosition, 1.0);",
        "}"
    ].join("\n"),

    fragmentShader: [
        "uniform sampler2D texture;",

        "varying vec2 vUv;",

        "void main() {",
        "   gl_FragColor = texture2D(texture, vUv);",
        "}"
    ].join("\n")
};

/**
    Shader for hit circles and sliders
*/
WOsu.Player.hitShader = {
    vertexShader: [
        // Some constants
        "#define EPSILON 0.1",
        "#define TYPE_CIRCLE 0.0",
        "#define TYPE_END_CIRCLE 1.0",
        "#define TYPE_SLIDER_BODY 2.0",
        "#define TYPE_SLIDER_REPEAT 3.0",

        // The current time of the playback
        "uniform float currentTime;",

        // Beatmap mechanics
        "uniform float approachRate;",
        "uniform float overallDifficulty;",
        "uniform float circleSize;",

        // The hit object color
        "attribute vec4 colorMask;",

        // The hit object start time
        "attribute float startTime;",

        // The hit object end time
        "attribute float endTime;",

        // When the beat was hit (otherwise positive infinity)
        "attribute float hitTime;",

        // When the beat was hit (but before OD threshold)
        // Cause the beat to shake a bit
        // TODO "uniform float earlyTime;"

        // When it's kiai time, flash like crazy
        // TODO "uniform float kiaiTime;"

        // Center of the hit object
        "attribute vec2 center;",

        // Hit object type
        // 0 = Numbered hit circle
        // 1 = End circle
        // 2 = Slider body
        // 3 = Repeat
        "attribute float hitType;",

        // TODO Combo number
        // "varying int? combo;"
        "varying vec3 vPosition;",
        "varying vec2 vUv;",
        "varying vec4 vColor;",
        "varying float vAlpha;",
        "varying float vType;",

        "void main() {",
        // If the circle is before the approach rate
        // Or after the overall difficulty threshold
        // Or the hit object is a circle and has already been hit
        "   if (currentTime - startTime < -approachRate || currentTime - endTime > overallDifficulty || (abs(hitType - TYPE_CIRCLE) < EPSILON && currentTime > hitTime)) {",
        // Draw a degenerate triangle behind the camera
        "       gl_Position = vec4(0.0, 0.0, -2.0, 1.0);",
        "   }",
        "   else {",
        // Interpolate alpha from approach rate to 50
        "       float alpha = clamp((approachRate + currentTime - startTime) / (approachRate - overallDifficulty), 0.0, 1.0);",
        "       vColor = colorMask;",
        "       vAlpha = alpha;",
        // Pass all other variables
        "       vPosition = position;",
        "       vUv = uv;",
        "       vType = hitType;",
        "       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "   }",
        "}"
    ].join("\n"),

    fragmentShader: [
        // Some constants
        "#define EPSILON 0.1",
        "#define TYPE_CIRCLE 0.0",
        "#define TYPE_END_CIRCLE 1.0",
        "#define TYPE_SLIDER_BODY 2.0",
        "#define TYPE_SLIDER_REPEAT 3.0",

        "uniform sampler2D hitcircle;",
        "uniform sampler2D hitcircle_overlay;",
        "uniform sampler2D digits[10];",

        "varying vec3 vPosition;",
        "varying vec2 vUv;",
        "varying vec4 vColor;",
        "varying float vAlpha;",
        "varying float vType;",

        "void main() {",
        "   vec4 color = vec4(0, 0, 0, 0);",
        "   vec4 tex1, tex2;",
        // Draw a circle
        "   if (abs(vType - TYPE_CIRCLE) < EPSILON) {",
        "       tex1 = texture2D(hitcircle, vUv);",
        "       color = tex1 * vColor * tex1.a;",
        "       tex2 = texture2D(hitcircle_overlay, vUv);",
        "       color = mix(color, tex2, tex2.a);",
        // TODO Draw digits
        "   }",
        // Draw an end circle
        "   else if (abs(vType - TYPE_END_CIRCLE) < EPSILON) {",
        "       tex1 = texture2D(hitcircle, vUv);",
        "       color = tex1 * vColor * tex1.a;",
        "       tex2 = texture2D(hitcircle_overlay, vUv);",
        "       color = mix(color, tex2, tex2.a);",
        "   }",
        // Draw the slider body
        "   else if (abs(vType - TYPE_SLIDER_BODY) < EPSILON) {",
        "       tex1 = texture2D(hitcircle, vUv);",
        "       color = tex1 * vColor * tex1.a;",
        "       tex2 = texture2D(hitcircle_overlay, vUv);",
        "       color = mix(color, tex2, tex2.a);",
        "   }",
        // Draw the slider repeat
        "   else if (abs(vType - TYPE_SLIDER_REPEAT) < EPSILON) {",
        "       //tex1 = texture2D(slider_repeat, vUv);",
        "       color = tex1 * tex1.a;",
        "   }",
        // TODO Draw the slider ball
        "   gl_FragColor = color * vec4(1.0, 1.0, 1.0, clamp(vAlpha + 0.5, 0.0, 1.0));",
        "}"
    ].join("\n")
};

/**
    Shader for spinners
*/
WOsu.Player.spinnerShader = {
    vertexShader: [
        // The current time of the playback
        "uniform float currentTime;",

        // Beatmap mechanics to compute opacity
        "uniform float approachRate;",
        "uniform float overallDifficulty;",
        "uniform float circleSize;",

        // The spinner start time
        "attribute float startTime;",

        // The spinner end time
        "attribute float endTime;",

        // The spin amount
        "attribute float spinAmount;",

        // When it's kiai time, flash like crazy
        // TODO "uniform float kiaiTime;"

        // TODO Spinner speed
        // "varying int? digit;"
        "varying vec2 vUv;",
        "varying vec4 vColor;",
        "varying float vAlpha;",
        "varying float vScale;",

        "void main() {",
        // If the spinner is before the approach rate
        // Or after the end time
        "   if (currentTime < startTime - approachRate || currentTime > endTime) {",
        // Draw a degenerate triangle behind the camera
        "       gl_Position = vec4(0, 0, -2, 1);",
        "   }",
        "   else {",
        "       float alpha = clamp((approachRate + currentTime - startTime) / (approachRate), 0.0, 1.0);",
        // Interpolate scale from start time to end time
        "       vScale = clamp((endTime - currentTime) / (endTime - startTime), 0.0, 1.0);",
        // Interpolate alpha from approach rate to start time
        "       vAlpha = alpha;",
        "       vColor = vec4(1.0, 1.0, 1.0, 1.0);",
        "       vUv = uv;",
        "       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "   }",
        "}"
    ].join("\n"),

    fragmentShader: [
        "uniform sampler2D spinner_approachcircle;",
        "uniform sampler2D spinner_circle;",
        "uniform sampler2D spinner_background;",

        "varying vec2 vUv;",
        "varying vec4 vColor;",
        "varying float vAlpha;",
        "varying float vScale;",

        "void main() {",
        "   vec4 color = vec4(0, 0, 0, 0);",
        "   vec4 tex = texture2D(spinner_background, vUv);",
        "   color = tex * vColor * tex.a;",

        // Spinner circle is square-ish
        // 512 x 384 -> 384 x 384
        "   vec2 nuv = vec2(vUv.x * 4.0 / 3.0 - 1.0 / 6.0, vUv.y);",
        "   tex = texture2D(spinner_circle, nuv);",
        "   color = mix(color, tex, tex.a);",

        // Approach circle is also square-ish
        "   nuv = 2.0 * (nuv - 0.5) / vScale;",
        "   if (nuv.x >= -1.0 && nuv.x <=1.0 && nuv.x >= -1.0 && nuv.x <= 1.0) {",
        "       nuv = (nuv + 1.0) / 2.0;",
        "       tex = texture2D(spinner_approachcircle, nuv);",
        "       color = mix(color, tex, tex.a);",
        "   }",

        "   gl_FragColor = color * vec4(1.0, 1.0, 1.0, vAlpha);",
        "}"
    ].join("\n")
};

/**
    Shader for approach circles
*/
WOsu.Player.approachShader = {
    vertexShader: [
        // The current time of the playback
        "uniform float currentTime;",

        // Beatmap mechanics to compute opacity and size
        "uniform float approachRate;",
        "uniform float overallDifficulty;",
        "uniform float circleSize;",

        // The hit object start time
        "attribute float startTime;",

        // The hit object hit time
        "attribute float hitTime;",

        // The hit object color
        "attribute vec4 colorMask;",

        // The position of the hit object
        "attribute vec2 center;",

        // When it's kiai time, flash like crazy
        // TODO "uniform float kiaiTime;"

        "varying vec2 vUv;",
        "varying vec4 vColor;",
        "varying float vAlpha;",

        "void main() {",
        // If the approach circle is before the approach rate
        // Or after the object time or hit time
        "   if (currentTime - startTime < -approachRate || currentTime > startTime || currentTime > hitTime) {",
        // Draw a degenerate triangle behind the camera
        "       gl_Position = vec4(0, 0, -2, 1);",
        "   }",
        "   else {",
        // Interpolate alpha from approach rate to 50
        "       float alpha = clamp((approachRate + currentTime - startTime) / (approachRate - overallDifficulty), 0.0, 1.0);",
        // Compute size
        "       vec3 scaledPosition = position;",
        "       float scale = 1.0 + 2.0 * (startTime - currentTime) / approachRate;",
        "       scaledPosition.x = scaledPosition.x * scale + center.x;",
        "       scaledPosition.y = scaledPosition.y * scale + center.y;",
        "       vColor = colorMask;",
        "       vAlpha = alpha;",
        "       vUv = uv;",
        "       gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPosition, 1.0);",
        "   }",
        "}"
    ].join("\n"),

    // FUTURE Handle sliders as osu does, built-in without textures (?)
    fragmentShader: [
        "uniform sampler2D approachcircle;",

        "varying vec2 vUv;",
        "varying vec4 vColor;",
        "varying float vAlpha;",

        "void main() {",
        "   vec4 tex1 = texture2D(approachcircle, vUv);",
        "   vec4 color = tex1 * vColor * tex1.a;",

        "   gl_FragColor = color * vAlpha;",
        "}"
    ].join("\n")
};

WOsu.Player.prototype.createThreeQuad = function (params) {
    if (params.size !== undefined) {
        params.width = params.height = params.size;
    }

    params.color = (params.color !== undefined) ? params.color : new THREE.Vector4(1, 1, 1, 1);

    var geometry = new THREE.PlaneGeometry(params.width, params.height, 1, 1);

    params.texture.minFilter = THREE.LinearFilter;
    params.texture.magFilter = THREE.LinearFilter;
    var material = new THREE.ShaderMaterial({
        uniforms: {
            texture: {
                type: 't',
                value: params.texture
            }
        },
        attributes: {
            colorMask: {
                type: 'v4',
                value: []
            }
        },

        vertexShader: WOsu.Player.quadShader.vertexShader,
        fragmentShader: WOsu.Player.quadShader.fragmentShader,

        side: THREE.DoubleSide,
        transparent: true
    });

    material.attributes.colorMask.value.push(
        params.color, params.color, params.color, params.color
    );

    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(params.x, params.y, params.z);

    return mesh;
}

WOsu.Player.prototype.createThreeCursor = function (params) {
    if (params.size !== undefined) {
        params.width = params.height = params.size;
    }

    params.color = (params.color !== undefined) ? params.color : new THREE.Vector4(1, 1, 1, 1);

    var geometry = new THREE.BufferGeometry();

    var s = 32 / 2.0;
    var positions = new Float32Array([-s, -s, 0, -s, s, 0,
        s, s, 0,

        -s, -s, 0,
        s, s, 0,
        s, -s, 0
    ]);
    geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));

    var uvs = new Float32Array([
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
        0.0, 0.0, 1.0, 1.0, 1.0, 0.0
    ]);
    geometry.addAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    var texture = this.skin.textures.cursor;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    var material = new THREE.ShaderMaterial({
        uniforms: {
            currentTime: {
                type: 'f',
                value: Number.NEGATIVE_INFINITY
            },
            isHit: {
                type: 'i',
                value: 0
            },
            hitTime: {
                type: 'f',
                value: Number.NEGATIVE_INFINITY
            },
            texture: {
                type: 't',
                value: texture
            }
        },

        vertexShader: WOsu.Player.cursorShader.vertexShader,
        fragmentShader: WOsu.Player.cursorShader.fragmentShader,

        side: THREE.DoubleSide,
        transparent: true
    });

    var mesh = new THREE.Mesh(geometry, material);

    return mesh;
}

WOsu.Player.prototype.createThreeApproachCircle = function (params) {
    var obj = params.object;
    var x = obj.x - 256;
    var y = 192 - obj.y;
    var z = params.z;
    var s = params.mechanics.CS;
    var colors = params.mechanics.colors;
    var r = colors[obj.combo][0] / 255.0;
    var g = colors[obj.combo][1] / 255.0;
    var b = colors[obj.combo][2] / 255.0;

    var geometry = new THREE.BufferGeometry();

    var positions = [-s, -s, z, -s, s, z,
        s, s, z,

        -s, -s, z,
        s, s, z,
        s, -s, z
    ];

    var uvs = [
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
        0.0, 0.0, 1.0, 1.0, 1.0, 0.0
    ];

    var colors = [
        r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0,
        r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0
    ];

    var startTimes = [
        obj.time, obj.time, obj.time,
        obj.time, obj.time, obj.time
    ];

    var hitTimes = [
        Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY
    ];

    var centers = [
        x, y, x, y, x, y,
        x, y, x, y, x, y
    ];

    geometry.addAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.addAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.addAttribute("colorMask", new THREE.BufferAttribute(new Float32Array(colors), 4));
    geometry.addAttribute("startTime", new THREE.BufferAttribute(new Float32Array(startTimes), 1));
    geometry.addAttribute("hitTime", new THREE.BufferAttribute(new Float32Array(hitTimes), 1));
    geometry.addAttribute("center", new THREE.BufferAttribute(new Float32Array(centers), 2));

    var mesh = new THREE.Mesh(geometry, params.material);

    return mesh;
}

WOsu.Player.prototype.createThreeCircle = function (params) {
    var obj = params.object;
    var x = obj.x - 256;
    var y = 192 - obj.y;
    var z = params.z;
    var s = params.mechanics.CS;
    var colors = params.mechanics.colors;
    var r = colors[obj.combo][0] / 255.0;
    var g = colors[obj.combo][1] / 255.0;
    var b = colors[obj.combo][2] / 255.0;

    var geometry = new THREE.BufferGeometry();

    var positions = [
        x - s, y - s, z,
        x - s, y + s, z,
        x + s, y + s, z,

        x - s, y - s, z,
        x + s, y + s, z,
        x + s, y - s, z
    ];

    var uvs = [
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
        0.0, 0.0, 1.0, 1.0, 1.0, 0.0
    ];

    var colors = [
        r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0,
        r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0
    ];

    var startTimes = [
        obj.time, obj.time, obj.time,
        obj.time, obj.time, obj.time
    ];

    var endTimes = [
        obj.time, obj.time, obj.time,
        obj.time, obj.time, obj.time
    ];

    var hitTimes = [
        Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY
    ];

    var centers = [
        x, y, x, y, x, y,
        x, y, x, y, x, y
    ];

    var hitTypes = [
        0.0, 0.0, 0.0,
        0.0, 0.0, 0.0
    ];

    geometry.addAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.addAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.addAttribute("colorMask", new THREE.BufferAttribute(new Float32Array(colors), 4));
    geometry.addAttribute("startTime", new THREE.BufferAttribute(new Float32Array(startTimes), 1));
    geometry.addAttribute("endTime", new THREE.BufferAttribute(new Float32Array(endTimes), 1));
    geometry.addAttribute("hitTime", new THREE.BufferAttribute(new Float32Array(hitTimes), 1));
    geometry.addAttribute("center", new THREE.BufferAttribute(new Float32Array(centers), 2));
    geometry.addAttribute("hitType", new THREE.BufferAttribute(new Float32Array(hitTypes), 1));

    var mesh = new THREE.Mesh(geometry, params.material);

    return mesh;
}

WOsu.Player.prototype.createThreeSliderStart = function (params) {
    var obj = params.object;
    var x = obj.x - 256;
    var y = 192 - obj.y;
    var z = params.z;
    var s = params.mechanics.CS;
    var colors = params.mechanics.colors;
    var r = colors[obj.combo][0] / 255.0;
    var g = colors[obj.combo][1] / 255.0;
    var b = colors[obj.combo][2] / 255.0;

    var geometry = new THREE.BufferGeometry();

    var positions = [
        x - s, y - s, z,
        x - s, y + s, z,
        x + s, y + s, z,

        x - s, y - s, z,
        x + s, y + s, z,
        x + s, y - s, z
    ];

    var uvs = [
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
        0.0, 0.0, 1.0, 1.0, 1.0, 0.0
    ];

    var colors = [
        r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0,
        r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0
    ];

    var startTimes = [
        obj.time, obj.time, obj.time,
        obj.time, obj.time, obj.time
    ];

    var endTimes = [
        obj.endTime, obj.endTime, obj.endTime,
        obj.endTime, obj.endTime, obj.endTime
    ];

    var hitTimes = [
        Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY
    ];

    var centers = [
        x, y, x, y, x, y,
        x, y, x, y, x, y
    ];

    var hitTypes = [
        0.0, 0.0, 0.0,
        0.0, 0.0, 0.0
    ];

    geometry.addAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.addAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.addAttribute("colorMask", new THREE.BufferAttribute(new Float32Array(colors), 4));
    geometry.addAttribute("startTime", new THREE.BufferAttribute(new Float32Array(startTimes), 1));
    geometry.addAttribute("endTime", new THREE.BufferAttribute(new Float32Array(endTimes), 1));
    geometry.addAttribute("hitTime", new THREE.BufferAttribute(new Float32Array(hitTimes), 1));
    geometry.addAttribute("center", new THREE.BufferAttribute(new Float32Array(centers), 2));
    geometry.addAttribute("hitType", new THREE.BufferAttribute(new Float32Array(hitTypes), 1));

    var mesh = new THREE.Mesh(geometry, params.material);

    return mesh;
}

WOsu.Player.prototype.createThreeSliderEnd = function (params) {
    var obj = params.object;
    var x = obj.endX - 256;
    var y = 192 - obj.endY;
    var z = params.z;
    var s = params.mechanics.CS;
    var colors = params.mechanics.colors;
    var r = colors[obj.combo][0] / 255.0;
    var g = colors[obj.combo][1] / 255.0;
    var b = colors[obj.combo][2] / 255.0;

    var geometry = new THREE.BufferGeometry();

    var positions = [
        x - s, y - s, z,
        x - s, y + s, z,
        x + s, y + s, z,

        x - s, y - s, z,
        x + s, y + s, z,
        x + s, y - s, z
    ];

    var uvs = [
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
        0.0, 0.0, 1.0, 1.0, 1.0, 0.0
    ];

    var colors = [
        r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0,
        r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0
    ];

    var startTimes = [
        obj.time, obj.time, obj.time,
        obj.time, obj.time, obj.time
    ];

    var endTimes = [
        obj.endTime, obj.endTime, obj.endTime,
        obj.endTime, obj.endTime, obj.endTime
    ];

    var hitTimes = [
        Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY
    ];

    var centers = [
        x, y, x, y, x, y,
        x, y, x, y, x, y
    ];

    var hitTypes = [
        1.0, 1.0, 1.0,
        1.0, 1.0, 1.0
    ];

    geometry.addAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.addAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.addAttribute("colorMask", new THREE.BufferAttribute(new Float32Array(colors), 4));
    geometry.addAttribute("startTime", new THREE.BufferAttribute(new Float32Array(startTimes), 1));
    geometry.addAttribute("endTime", new THREE.BufferAttribute(new Float32Array(endTimes), 1));
    geometry.addAttribute("hitTime", new THREE.BufferAttribute(new Float32Array(hitTimes), 1));
    geometry.addAttribute("center", new THREE.BufferAttribute(new Float32Array(centers), 2));
    geometry.addAttribute("hitType", new THREE.BufferAttribute(new Float32Array(hitTypes), 1));

    var mesh = new THREE.Mesh(geometry, params.material);

    return mesh;
}

WOsu.Player.prototype.createThreeSliderBody = function (params) {
    var obj = params.object;
    var z = params.z;
    var s = params.mechanics.CS;
    var colors = params.mechanics.colors;
    var r = colors[obj.combo][0] / 255.0;
    var g = colors[obj.combo][1] / 255.0;
    var b = colors[obj.combo][2] / 255.0;

    var geometry = new THREE.BufferGeometry();

    var positions = [];
    var uvs = [];
    var indices = [];
    var colors = [];
    var startTimes = [];
    var endTimes = [];
    var hitTimes = [];
    var centers = [];
    var hitTypes = [];

    // Generate the curve itself
    obj.generateBezier();

    // Translate curve points
    var curve = [];
    var l = obj.curveX.length;
    for (var i = 0; i < l; i++) {
        curve.push(new THREE.Vector2(
            obj.curveX[i] - 256, 192 - obj.curveY[i]
        ));
    }

    // Compute curve normals
    var normals = [];
    normals.push(new THREE.Vector2(
        curve[1].y - curve[0].y, curve[0].x - curve[1].x
    ).normalize());
    for (var i = 1; i < l - 1; i++) {
        var v0 = new THREE.Vector2(
            curve[i].x - curve[i - 1].x, curve[i].y - curve[i - 1].y
        ).normalize();
        var v1 = new THREE.Vector2(
            curve[i + 1].x - curve[i].x, curve[i + 1].y - curve[i].y
        ).normalize();
        v0.add(v1).normalize();

        normals.push(new THREE.Vector2(v0.y, -v0.x));
    }
    normals.push(new THREE.Vector2(
        curve[l - 1].y - curve[l - 2].y, curve[l - 2].x - curve[l - 1].x
    ).normalize());

    // Scale normals by circle size
    for (var i = 0; i < l; i++) {
        normals[i].multiplyScalar(s);
    }

    // Construct the geometry
    for (var i = 0; i < l; i++) {
        var v0 = curve[i].clone().add(normals[i]);
        var v1 = curve[i].clone().sub(normals[i]);
        positions.push(v0.x, v0.y, params.z, v1.x, v1.y, params.z);
        uvs.push(0.5, 0.0, 0.5, 1.0);
        colors.push(r, g, b, 1.0, r, g, b, 1.0);
        startTimes.push(obj.time, obj.time);
        endTimes.push(obj.endTime, obj.endTime);
        hitTimes.push(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
        centers.push(curve[i].x, curve[i].y, curve[i].x, curve[i].y);
        hitTypes.push(2.0, 2.0);
    }
    // Add faces
    for (var i = 0; i < l - 1; i++) {
        indices.push(
            2 * i + 0, 2 * i + 1, 2 * i + 2,
            2 * i + 2, 2 * i + 1, 2 * i + 3
        );
    }

    // Semicircle end caps
    var start = curve[0].clone().sub(curve[1]).normalize().multiplyScalar(s);
    var end = curve[l - 1].clone().sub(curve[l - 2]).normalize().multiplyScalar(s);
    var point;
    // Start cap
    point = curve[0].clone().add(normals[0]);
    positions.push(point.x, point.y, params.z);
    point = curve[0].clone().sub(normals[0]);
    positions.push(point.x, point.y, params.z);
    point = curve[0].clone().add(start).add(normals[0]);
    positions.push(point.x, point.y, params.z);
    point = curve[0].clone().add(start).sub(normals[0]);
    positions.push(point.x, point.y, params.z);
    uvs.push(0.5, 0.0, 0.5, 1.0, 0.0, 0.0, 0.0, 1.0);
    colors.push(r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0);
    startTimes.push(obj.time, obj.time, obj.time, obj.time);
    endTimes.push(obj.endTime, obj.endTime, obj.endTime, obj.endTime);
    hitTimes.push(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    centers.push(curve[0].x, curve[0].y, curve[0].x, curve[0].y, curve[0].x, curve[0].y, curve[0].x, curve[0].y);
    hitTypes.push(2.0, 2.0, 2.0, 2.0);
    indices.push(
        2 * l + 0, 2 * l + 1, 2 * l + 2,
        2 * l + 2, 2 * l + 1, 2 * l + 3
    );

    // End cap
    point = curve[l - 1].clone().add(normals[l - 1]);
    positions.push(point.x, point.y, params.z);
    point = curve[l - 1].clone().sub(normals[l - 1]);
    positions.push(point.x, point.y, params.z);
    point = curve[l - 1].clone().add(end).add(normals[l - 1]);
    positions.push(point.x, point.y, params.z);
    point = curve[l - 1].clone().add(end).sub(normals[l - 1]);
    positions.push(point.x, point.y, params.z);
    uvs.push(0.5, 0.0, 0.5, 1.0, 1.0, 0.0, 1.0, 1.0);
    colors.push(r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0);
    startTimes.push(obj.time, obj.time, obj.time, obj.time);
    endTimes.push(obj.endTime, obj.endTime, obj.endTime, obj.endTime);
    hitTimes.push(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    centers.push(curve[l - 1].x, curve[l - 1].y, curve[l - 1].x, curve[l - 1].y, curve[l - 1].x, curve[l - 1].y, curve[l - 1].x, curve[l - 1].y);
    hitTypes.push(2.0, 2.0, 2.0, 2.0);
    indices.push(
        2 * l + 4, 2 * l + 5, 2 * l + 6,
        2 * l + 6, 2 * l + 5, 2 * l + 7
    );

    geometry.addAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.addAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.addAttribute("index", new THREE.BufferAttribute(new Uint32Array(indices), 3));
    geometry.addAttribute("colorMask", new THREE.BufferAttribute(new Float32Array(colors), 4));
    geometry.addAttribute("startTime", new THREE.BufferAttribute(new Float32Array(startTimes), 1));
    geometry.addAttribute("endTime", new THREE.BufferAttribute(new Float32Array(endTimes), 1));
    geometry.addAttribute("hitTime", new THREE.BufferAttribute(new Float32Array(hitTimes), 1));
    geometry.addAttribute("center", new THREE.BufferAttribute(new Float32Array(centers), 2));
    geometry.addAttribute("hitType", new THREE.BufferAttribute(new Float32Array(hitTypes), 1));

    var mesh = new THREE.Mesh(geometry, params.material);

    return mesh;
}

WOsu.Player.prototype.createThreeSpinner = function (params) {
    var obj = params.object;
    var z = params.z;

    var geometry = new THREE.BufferGeometry();

    var positions = [-320, -240, z, -320, 240, z,
        320, 240, z,

        -320, -240, z,
        320, 240, z,
        320, -240, z
    ];

    var uvs = [
        0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
        0.0, 0.0, 1.0, 1.0, 1.0, 0.0
    ];

    var startTimes = [
        obj.time, obj.time, obj.time,
        obj.time, obj.time, obj.time
    ];

    var endTimes = [
        obj.endTime, obj.endTime, obj.endTime,
        obj.endTime, obj.endTime, obj.endTime
    ];

    var spinAmounts = [
        0, 0, 0, 0, 0, 0
    ];

    geometry.addAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.addAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.addAttribute("startTime", new THREE.BufferAttribute(new Float32Array(startTimes), 1));
    geometry.addAttribute("endTime", new THREE.BufferAttribute(new Float32Array(endTimes), 1));
    geometry.addAttribute("spinAmount", new THREE.BufferAttribute(new Float32Array(spinAmounts), 1));

    var mesh = new THREE.Mesh(geometry, params.material);

    return mesh;
}



WOsu.Player.prototype.play = function () {
    var instance = this;

    this.playing = true;
    this.audio.load();
    this.audio.addEventListener("canplay", function () {
        instance.audio.play();
    });

    this.frame();
}

WOsu.Player.prototype.frame = function () {
    var instance = this;
    requestAnimationFrame(function () {
        instance.frame();
    });

    if (this.playing) {
        var time = this.audio.currentTime * 1000;

        this.frame_storyboard(time);

        // Parse the replay first so scores are updated correctly
        this.frame_replay(time);

        // Update game uniforms
        this.frame_game(time);
    }

    var renderer = this.three.renderer;
    renderer.render(this.three.scene, this.three.camera);
}

WOsu.Player.prototype.frame_game = function (time) {
    var game = this.three.layers.gameplay.properties;

    // Show / hide approaching objects
    var threshold = this.beatmap.BeatmapMechanics.AR * 2;
    var mesh;
    // Show
    while (game.objectEnd < game.objectLength && (mesh = game.objects[game.objectEnd]).gameObject.time < time + threshold) {
        mesh.visible = true;
        game.objectEnd++;
    }
    // Hide
    while (game.objectStart < game.objectLength && (mesh = game.objects[game.objectStart]).gameObject.endTime < time - threshold) {
        mesh.visible = false;
        game.objectStart++;
    }

    // Set gameplay uniforms
    var uniforms;
    uniforms = game.hitMaterial.uniforms;
    uniforms.currentTime.value = time;
    uniforms = game.spinnerMaterial.uniforms;
    uniforms.currentTime.value = time;
    uniforms = game.approachMaterial.uniforms;
    uniforms.currentTime.value = time;

    // TODO Handler follow points
    // TODO Handle sliders and spinners as well
    // TODO Handle slider balls (but not slider ball circle!)
}

WOsu.Player.prototype.frame_replay = function (time) {
    var bmm = this.beatmap.BeatmapMechanics;
    var replay = this.three.layers.replay.properties;
    var data = this.replay.replayData;
    var game = this.game;
    var index = this.game.index;
    var score = this.game.score;
    var events = this.beatmap.BeatmapMechanics.events;

    while (index.replayIndex < index.replayLength) {
        var currReplay = data[index.replayIndex];
        var currKeys = currReplay.keys;
        var lastReplay = (index.replayIndex > 0) ? data[index.replayIndex - 1] : currReplay;
        var lastKeys = lastReplay.keys;

        var keyDown = lastKeys > 0;
        var keyPress = (WOsu.Replay.hasAction(currKeys, WOsu.Replay.M1) && !WOsu.Replay.hasAction(lastKeys, WOsu.Replay.M1)) || (WOsu.Replay.hasAction(currKeys, WOsu.Replay.M2) && !WOsu.Replay.hasAction(lastKeys, WOsu.Replay.M2));
        var keyRelease = (currKeys == 0) && (lastKeys > 0);

        // Advance through hold events (and missed events)
        var pass = true;
        while (index.eventIndex < index.eventLength && pass) {
            pass = false;
            var event = events[index.eventIndex];
            var timeDiff = currReplay.time - event.time;
            var distDiff = Math.sqrt((currReplay.x - event.x) * (currReplay.x - event.x) + (currReplay.y - event.y) * (currReplay.y - event.y));
            if (event.isType(WOsu.GameEvent.TYPE_CIRCLE)) {

                if (timeDiff > bmm.OD) {
                    // Missed hit circle
                    score.record0();
                    score.recordBreak();
                    console.log("Circle miss " + event.time);
                    pass = true;
                }

            }
            else if (event.isType(WOsu.GameEvent.TYPE_SLIDER_START)) {

                if (timeDiff > bmm.OD) {
                    // Only the slider start is subject to od lock
                    console.log("Slider start miss");
                    score.recordBreak();
                    pass = true;
                    // Add to the current list of sliders
                    game.currentSliders.push(event.parent);
                }

            }
            else if (event.isType(WOsu.GameEvent.TYPE_SLIDER_END)) {

                if (timeDiff > 0) {
                    if (event.parent.data.hold) {
                        event.parent.data.hit++;
                        // Compute score
                        if (event.parent.data.hit == event.parent.data.total) {
                            // All ticks hit
                            score.record300();
                        }
                        else if (event.parent.data.hit * 2 >= event.parent.data.total) {
                            // At least half ticks hit
                            score.record100();
                        }
                        else {
                            // At least one hit
                            score.record50();
                        }
                        pass = true;
                        console.log("1 " + event.parent.data.hit + " " + event.parent.data.total);

                        score.recordCombo();
                    }
                    else {
                        if (event.parent.data.hit * 2 >= event.parent.data.total) {
                            // At least half ticks hit
                            score.record100();
                        }
                        else if (event.parent.data.hit > 0) {
                            // At least one hit
                            score.record50();
                        }
                        else {
                            // Completely missed
                            score.record0();
                        }
                        pass = true;
                        console.log("2 " + event.parent.data.hit + " " + event.parent.data.total);
                    }
                    // Remove from the current list of sliders
                    game.currentSliders.splice(game.currentSliders.indexOf(event.parent), 1);
                }

            }
            else if (event.isType(WOsu.GameEvent.TYPE_SLIDER)) {

                // Slider parts are immediate misses
                if (timeDiff > 0) {
                    if (event.parent.data.hold) { // Hit
                        if (event.isType(WOsu.GameEvent.TYPE_SLIDER_POINT)) {
                            score.record30();
                        }
                        else if (event.isType(WOsu.GameEvent.TYPE_SLIDER_TICK)) {
                            score.record10();
                        }
                        score.recordCombo();
                        event.parent.data.hit++;
                        pass = true;
                    }
                    else { // Miss
                        console.log("Slider break " + event.time);
                        console.log(event.parent.data);
                        score.recordBreak();
                        pass = true;
                    }
                }

            }
            else if (event.isType(WOsu.GameEvent.TYPE_SPINNER_START)) {
                pass = true;
            }
            else if (event.isType(WOsu.GameEvent.TYPE_SPINNER_END)) {
                // TODO Spinner end
                score.record300();
                score.recordCombo();
                pass = true;
            }
            else {
                pass = true;
            }

            if (pass) {
                index.eventIndex++;
            }
        }

        // Check for edges (circles and slider starts)
        // TODO NOW Check for distance
        if (index.eventIndex < index.eventLength && keyPress && index.replayEdge <= index.replayIndex) { // Rising edge

            var event = events[index.eventIndex];
            var timeDiff = Math.abs(event.time - currReplay.time);
            var distDiff = Math.sqrt((currReplay.x - event.x) * (currReplay.x - event.x) + (currReplay.y - event.y) * (currReplay.y - event.y));
            if (event.isType(WOsu.GameEvent.TYPE_CIRCLE) && distDiff <= bmm.CS) {
                
                if (timeDiff < bmm.hit300) {
                    score.record300();
                    score.recordCombo();
                    index.eventIndex++;
                }
                else if (timeDiff < bmm.hit100) {
                    score.record100();
                    score.recordCombo();
                    index.eventIndex++;
                }
                else if (timeDiff < bmm.hit50) {
                    score.record50();
                    score.recordCombo();
                    index.eventIndex++;
                }
                else {
                    // TODO Circles miss if too early (?)
                }
                
                event.data.finish = true;

                // TODO Modify hitTime attribute
                
            }
            else if (event.isType(WOsu.GameEvent.TYPE_SLIDER_START) && distDiff <= bmm.CS) {

                if (timeDiff < bmm.OD) {
                    event.parent.data.hit++;
                    event.parent.data.hold = true;
                    score.recordCombo();
                    index.eventIndex++;
                }
                else if (timeDiff < bmm.AR) {
                    // Hitting too early counts as a miss
                    console.log("Slider start early");
                    score.recordBreak();
                    index.eventIndex++;
                }
                // Add to the current list of sliders
                game.currentSliders.push(event.parent);

            }

            index.replayEdge = index.replayIndex + 1;

        }
        else if (keyRelease) { // Complete falling edge

            // TODO
            index.replayEdge = index.replayIndex + 1;

        }

        // Detect any non-fixed events:
        //     Slider breaks by moving out of the circle or lifting up the key
        //     Slider holds by keydown over the slider
        //     Spinner spinning
        var keyStillDown = currKeys > 0; // Keydown referring to the current time
        for (var i = 0; i < game.currentSliders.length; i++) {
            var slider = game.currentSliders[i];
            var distance = slider.gameObject.getDistance(currReplay.time, currReplay.x, currReplay.y);
            if (slider.data.hold) {
                if (keyRelease || distance > 2 * bmm.CS) {
                    slider.data.hold = false;
                    console.log(keyRelease + " " + distance);
                }
            }
            else {
                if (keyStillDown && distance <= bmm.CS) {
                    slider.data.hold = true;
                }
            }
        }
        if (game.currentSpinners.length > 0) {
            var spinner = game.currentSpinners[0];
            if (keyDown && keyStillDown) {
                // TODO Spinner spinning
                var lastAngle = Math.atan2(lastReplay.y, lastReplay.x);
                var currAngle = Math.atan2(currReplay.y, currReplay.x);
                var diff = (Math.abs(lastAngle - currAngle) / (2.0 * Math.PI)) % 1.0;
                diff = (diff > 0.5) ? 1.0 - diff : diff;
                spinner.parent.data.spins += diff;
            }
        }

        // Advance replay
        if (index.replayIndex < index.replayLength - 1 && time > data[index.replayIndex + 1].time) {
            index.replayIndex++;
        }
        else {
            break;
        }
    }

    // Get the current and next sets of replay data
    var rd = data[index.replayIndex];
    var nd = (index.replayIndex === index.replayLength - 1) ? rd : data[index.replayIndex + 1];

    // Transform to cartesian coordinates
    var p1 = new THREE.Vector3(rd.x - 256, 192 - rd.y, 0);
    var p2 = new THREE.Vector3(nd.x - 256, 192 - nd.y, 0);

    // Compute interpolation between the sets
    var interp = (nd.time - rd.time === 0) ? 0 : (time - rd.time) / (nd.time - rd.time);
    var cursor = replay.cursorMesh;
    cursor.position.lerpVectors(p1, p2, interp);

    // Set cursor uniforms
    var uniforms = cursor.material.uniforms;
    uniforms.currentTime.value = time;
    uniforms.isHit.value = (rd.keys > 0) ? 1 : 0;
    uniforms.hitTime.value = (rd.keys > 0) ? rd.time : rd.lastReleaseTime;
}

WOsu.Player.prototype.frame_storyboard = function (time) {
    // TODO Storyboard
}

/**
    Handles scoring
*/
WOsu.ScoreManager = function(mechanics) {
    this.mechanics = mechanics;
    
    this.totalScore = 0;
    this.totalAccuracy = 0;
    this.currentCombo = 0;
    this.maxCombo = 0;
    
    this.hit300 = 0;
    this.hit200 = 0;
    this.hit100 = 0;
    this.hit50 = 0;
    this.hit0 = 0;
    
    this.hit300g = 0;
    this.hit300k = 0;
    this.hit100k = 0;
    
    this.combos = [];
}

WOsu.ScoreManager.prototype.constructor = WOsu.ScoreManager;

/**
    Compute the accuracy.
*/
WOsu.ScoreManager.prototype.getAccuracy = function() {
    var totalHits = this.hit300 + this.hit200 + this.hit100 + this.hit50 + this.hit0;
    var weightedHits = 3.0 / 3.0 * this.hit300 + 2.0 / 3.0 * this.hit200 + 1.0 / 3.0  * this.hit100 + 0.5 / 3.0 * this.hit50 + 0.0 / 3.0 * this.hit0;
    
    if (totalHits == 0) {
        this.totalAccuracy = 0;
    }
    else {
        this.totalAccuracy = weightedHits / totalHits;
    }
    return this.totalAccuracy;
}

/**
    Record an incrase in combo.
*/
WOsu.ScoreManager.prototype.recordCombo = function() {
    this.currentCombo++;
    if (this.currentCombo > this.maxCombo) {
        this.maxCombo = this.currentCombo;
    }
}

/**
    Record a combo break.
*/
WOsu.ScoreManager.prototype.recordBreak = function() {
    this.combos.push(this.currentCombo);
    this.currentCombo = 0;
}

/**
    Record a score. Call this BEFORE recordCombo.
*/
WOsu.ScoreManager.prototype.recordScore = function(amount) {
    var comboMultiplier = this.currentCombo - 1;
    if (comboMultiplier < 0) {
        comboMultiplier = 0;
    }
    var extra = comboMultiplier * this.mechanics.difficultyMultiplier * this.mechanics.modMultiplier;
    var totalAmount = amount + ~~(amount * extra / 25.0);
    this.totalScore += totalAmount;
}

/**
    Record a 300. Call this BEFORE recordCombo.
*/
WOsu.ScoreManager.prototype.record300 = function() {
    this.hit300++;
    this.recordScore(300);
}

/**
    Record a 100. Call this BEFORE recordCombo.
*/
WOsu.ScoreManager.prototype.record100 = function() {
    this.hit100++;
    this.recordScore(100);
}

/**
    Record a 50. Call this BEFORE recordCombo.
*/
WOsu.ScoreManager.prototype.record50 = function() {
    this.hit50++;
    this.recordScore(50);
}

/**
    Record a miss. Call this BEFORE recordCombo.
*/
WOsu.ScoreManager.prototype.record0 = function() {
    this.hit0++;
    this.recordScore(0);
}

/**
    Record a slider tick.
*/
WOsu.ScoreManager.prototype.record10 = function() {
    this.totalScore += 10;
}

/**
    Record a slider point.
*/
WOsu.ScoreManager.prototype.record30 = function() {
    this.totalScore += 30;
}

// TODO Other record amounts + k, g

WOsu.Matrix3 = function(args) {
	this.matrix = new Array(9);
	try {
		this.matrix = [ 1,0,0, 0,1,0, 0,0,1 ];
		if (args.length==1 && args[0]==0) {
			this.matrix = [ 0,0,0, 0,0,0, 0,0,0 ];
		}
		else if (args.length==4) {
			this.matrix[0] = args[0];
			this.matrix[1] = args[1];
			this.matrix[3] = args[2];
			this.matrix[4] = args[3];
		}
		else if (args.length>=6) {
			for (var i=0; i<args.length; i++) this.matrix[i] = args[i];
		}
	}
	catch (err) {
		this.matrix = [ 1,0,0, 0,1,0, 0,0,1 ];
	}
}

WOsu.Matrix3.prototype.constructor = WOsu.Matrix3;

WOsu.Matrix3.getRotation = function(theta) {
	return new WOsu.Matrix3([Math.cos(theta),-Math.sin(theta),Math.sin(theta),Math.cos(theta)]);
}

WOsu.Matrix3.getScale = function(x,y) {
	return new WOsu.Matrix3([ x,0,0, 0,y,0, 0,0,1 ]);
}

WOsu.Matrix3.getTranslation = function(x,y) {
	return new WOsu.Matrix3([ 1,0,x, 0,1,y, 0,0,1 ]);
}

WOsu.Matrix3.prototype.clone = function() {
	return new WOsu.Matrix3(this.matrix);
}

WOsu.Matrix3.prototype.reset = function() {
	this.matrix = [ 1,0,0, 0,1,0, 0,0,1 ];
}

WOsu.Matrix3.prototype.multiply = function(mat2) {
	this.matrix = [
		this.matrix[0]*mat2.matrix[0] + this.matrix[1]*mat2.matrix[3] + this.matrix[2]*mat2.matrix[6],
		this.matrix[0]*mat2.matrix[1] + this.matrix[1]*mat2.matrix[4] + this.matrix[2]*mat2.matrix[7],
		this.matrix[0]*mat2.matrix[2] + this.matrix[1]*mat2.matrix[5] + this.matrix[2]*mat2.matrix[8],
		this.matrix[3]*mat2.matrix[0] + this.matrix[4]*mat2.matrix[3] + this.matrix[5]*mat2.matrix[6],
		this.matrix[3]*mat2.matrix[1] + this.matrix[4]*mat2.matrix[4] + this.matrix[5]*mat2.matrix[7],
		this.matrix[3]*mat2.matrix[2] + this.matrix[4]*mat2.matrix[5] + this.matrix[5]*mat2.matrix[8],
		this.matrix[6]*mat2.matrix[0] + this.matrix[7]*mat2.matrix[3] + this.matrix[8]*mat2.matrix[6],
		this.matrix[6]*mat2.matrix[1] + this.matrix[7]*mat2.matrix[4] + this.matrix[8]*mat2.matrix[7],
		this.matrix[6]*mat2.matrix[2] + this.matrix[7]*mat2.matrix[5] + this.matrix[8]*mat2.matrix[8]
	];
}

WOsu.Matrix3.prototype.multiplyB = function(mat2) {
	this.matrix = [
		mat2.matrix[0]*this.matrix[0] + mat2.matrix[1]*this.matrix[3] + mat2.matrix[2]*this.matrix[6],
		mat2.matrix[0]*this.matrix[1] + mat2.matrix[1]*this.matrix[4] + mat2.matrix[2]*this.matrix[7],
		mat2.matrix[0]*this.matrix[2] + mat2.matrix[1]*this.matrix[5] + mat2.matrix[2]*this.matrix[8],
		mat2.matrix[3]*this.matrix[0] + mat2.matrix[4]*this.matrix[3] + mat2.matrix[5]*this.matrix[6],
		mat2.matrix[3]*this.matrix[1] + mat2.matrix[4]*this.matrix[4] + mat2.matrix[5]*this.matrix[7],
		mat2.matrix[3]*this.matrix[2] + mat2.matrix[4]*this.matrix[5] + mat2.matrix[5]*this.matrix[8],
		mat2.matrix[6]*this.matrix[0] + mat2.matrix[7]*this.matrix[3] + mat2.matrix[8]*this.matrix[6],
		mat2.matrix[6]*this.matrix[1] + mat2.matrix[7]*this.matrix[4] + mat2.matrix[8]*this.matrix[7],
		mat2.matrix[6]*this.matrix[2] + mat2.matrix[7]*this.matrix[5] + mat2.matrix[8]*this.matrix[8]
	];
}

WOsu.Matrix3.multiply = function(mat1,mat2) {
	return new WOsu.Matrix3([
		mat1.matrix[0]*mat2.matrix[0] + mat1.matrix[1]*mat2.matrix[3] + mat1.matrix[2]*mat2.matrix[6],
		mat1.matrix[0]*mat2.matrix[1] + mat1.matrix[1]*mat2.matrix[4] + mat1.matrix[2]*mat2.matrix[7],
		mat1.matrix[0]*mat2.matrix[2] + mat1.matrix[1]*mat2.matrix[5] + mat1.matrix[2]*mat2.matrix[8],
		mat1.matrix[3]*mat2.matrix[0] + mat1.matrix[4]*mat2.matrix[3] + mat1.matrix[5]*mat2.matrix[6],
		mat1.matrix[3]*mat2.matrix[1] + mat1.matrix[4]*mat2.matrix[4] + mat1.matrix[5]*mat2.matrix[7],
		mat1.matrix[3]*mat2.matrix[2] + mat1.matrix[4]*mat2.matrix[5] + mat1.matrix[5]*mat2.matrix[8],
		mat1.matrix[6]*mat2.matrix[0] + mat1.matrix[7]*mat2.matrix[3] + mat1.matrix[8]*mat2.matrix[6],
		mat1.matrix[6]*mat2.matrix[1] + mat1.matrix[7]*mat2.matrix[4] + mat1.matrix[8]*mat2.matrix[7],
		mat1.matrix[6]*mat2.matrix[2] + mat1.matrix[7]*mat2.matrix[5] + mat1.matrix[8]*mat2.matrix[8]
	]);
}

WOsu.Matrix3.prototype.getCSS3Transform = function() {
	return "matrix(" + [this.matrix[0],this.matrix[3],this.matrix[1],this.matrix[4],this.matrix[2],this.matrix[5]].join() + ")";
}
WOsu.Replay = function(json) {
    this.type = 0; // Gameplay type
    this.version = 0; // osu! version
    this.bhash = ""; // Beatmap hash
    this.player = ""; // Player name
    this.rhash = ""; // Replay hash
    this.hits = [0, 0, 0, 0, 0, 0]; // Hit counts
    this.score = 0; // Score
    this.combo = 0; // Combo
    this.perfect = false; // Perfect replay
    this.mods = 0; // Mods
    this.graph = []; // Performance graph
    this.timestamp = 0; // Timestamp
    this.replayData = []; // Actions
}

WOsu.Replay.M1 = 1;
WOsu.Replay.M2 = 2;
WOsu.Replay.K1 = 5;
WOsu.Replay.K2 = 10;

WOsu.Replay.hasAction = function(bits, action) {
    return (bits & action) === action;
}

WOsu.Replay.prototype.constructor = WOsu.Replay;
WOsu.ReplayLoader = {};

WOsu.ReplayLoader.loadJSON = function(data, finish, progress) {
    var replay = new WOsu.Replay();

    for (var i in json) {
        this[i] = json[i];
    }

    return replay;
}

WOsu.ReplayLoader.loadRaw = function(data, finish, progress) {
    var replay = new WOsu.Replay();

    var bytes = new Uint8ClampedArray(~~(data.length / 2));
    for (var i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(data[2 * i] + data[2 * i + 1], 16);
    }
    var index = 0;

    function getByte() {
        return bytes[index++];
    }

    function getShort() {
        return bytes[index++] | (bytes[index++] << 8);
    }

    function getInt() {
        return bytes[index++] | (bytes[index++] << 8) | (bytes[index++] << 16) | (bytes[index++] << 24);
    }

    function getLong() {
        return getInt() + getInt() * 0x100000000;
    }

    function getULEB128() {
        var val = 0;
        var i = 0;
        var c;
        while (((c = getByte()) & 0x80) == 0x80) {
            val = val | ((c & 0x7F) << (i++ * 7));
        }
        val = val | ((c & 0x7F) << (i++ * 7));
        return val;
    }

    function getString(len) {
        var s = "";
        for (var i = 0; i < len; i++) {
            s += String.fromCharCode(getByte());
        }
        return s;
    }

    function getBytes(len) {
        var b = new Uint8ClampedArray(len);
        for (var i = 0; i < len; i++) {
            b[i] = getByte();
        }
        return b;
    }

    function getGraph(str) {
        return str;
    }

    function parseReplayData(data) {
        if (!data) return;
        var lines = data.split(",");
        var parts;

        var time = 0;
        var lastReleaseTime = Number.NEGATIVE_INFINITY;
        var keys;

        for (var i = 0; i < lines.length; i++) {
            parts = lines[i].split("|");
            time += parseInt(parts[0]);
            keys = parseInt(parts[3]);
            // If falling edge then reset the last release time
            if (i > 0 && replay.replayData[i-1].keys > 0 && keys === 0) {
                lastReleaseTime = time;
            }
            
            replay.replayData.push({
                time: time,
                x: parseFloat(parts[1]),
                y: parseFloat(parts[2]),
                keys: keys,
                lastReleaseTime: lastReleaseTime
            });
        }
    }

    var cont = 0;

    replay.type = getByte();
    replay.version = getInt();
    cont = getByte();
    if (cont == 0x0B) replay.bhash = getString(getULEB128());
    cont = getByte();
    if (cont == 0x0B) replay.player = getString(getULEB128());
    cont = getByte();
    if (cont == 0x0B) replay.rhash = getString(getULEB128());
    replay.hits[0] = getShort();
    replay.hits[1] = getShort();
    replay.hits[2] = getShort();
    replay.hits[3] = getShort();
    replay.hits[4] = getShort();
    replay.hits[5] = getShort();
    replay.score = getInt();
    replay.combo = getShort();
    replay.perfect = getByte() == 1;
    replay.mods = getInt();
    cont = getByte();
    if (cont == 0x0B) replay.graph = getGraph(getString(getULEB128()));
    replay.timestamp = getLong();

    var datasize = getInt();
    LZMA.decompress(
        bytes.subarray(index),
        function(data) {
            parseReplayData(data);
            finish(replay);
        },
        function(percent) {
            progress(percent);
        }
    );

    return replay;
}
WOsu.Skin = function(url) {
    this.url = url || "";
    this.textures = {};
    this.status = 0;
}

WOsu.Skin.prototype.constructor = WOsu.Skin;

WOsu.Skin.textureList = { // List of textures
    approachcircle: "approachcircle.png",

    cursor: "cursor.png",
    cursortrail: "cursortrail.png",

    hitcircle: "hitcircle.png",
    hitcircle_overlay: "hitcircleoverlay.png",

    slider_b: "sliderb.png",
    slider_followcircle: "sliderfollowcircle.png",
    slider_point10: "sliderpoint10.png",
    slider_point30: "sliderpoint30.png",
    slider_scorepoint: "sliderscorepoint.png",
    reversearrow: "reversearrow.png",

    spinner_approachcircle: "spinner-approachcircle.png",
    spinner_background: "spinner-background.png",
    spinner_circle: "spinner-circle.png",
    spinner_clear: "spinner-clear.png",
    spinner_metre: "spinner-metre.png",
    spinner_osu: "spinner-osu.png",
    spinner_rpm: "spinner-rpm.png",
    spinner_spin: "spinner-spin.png",

    hit_0: "hit0.png",
    hit_50: "hit50.png",
    hit_50k: "hit50k.png",
    hit_100: "hit100.png",
    hit_100k: "hit100k.png",
    hit_300: "hit300.png",
    hit_300g: "hit300g.png",
    hit_300k: "hit300k.png",

    lighting: "lighting.png",

    default_0: "default-0.png",
    default_1: "default-1.png",
    default_2: "default-2.png",
    default_3: "default-3.png",
    default_4: "default-4.png",
    default_5: "default-5.png",
    default_6: "default-6.png",
    default_7: "default-7.png",
    default_8: "default-8.png",
    default_9: "default-9.png",

    score_0: "score-0.png",
    score_1: "score-1.png",
    score_2: "score-2.png",
    score_3: "score-3.png",
    score_4: "score-4.png",
    score_5: "score-5.png",
    score_6: "score-6.png",
    score_7: "score-7.png",
    score_8: "score-8.png",
    score_9: "score-9.png",
    score_comma: "score-comma.png",
    score_dot: "score-dot.png",
    score_percent: "score-percent.png",
    score_x: "score-x.png",

    scorebar_bg: "scorebar-bg.png",
    scorebar_colour: "scorebar-colour.png",
    scorebar_ki: "scorebar-ki.png",
    scorebar_kidanger: "scorebar-kidanger.png",
    scorebar_kidanger2: "scorebar-kidanger2.png",

    section_fail: "section-fail.png",
    section_pass: "section-pass.png",

    volume: "volume-bg.png"
};
WOsu.SkinLoader = {};

/**
    Folder of the default skin elements. Elements in this folder must be complete and accessible.
 */
WOsu.SkinLoader.defaultURL = "Skins/default/";

/**
    Load skin images from a root path.
 */
// FUTURE read skin.ini, 4k, 5k etc.
// FUTURE handle animated skin elements
// FUTURE handle high resolution textures
WOsu.SkinLoader.load = function(loc, progress) {
    var instance = new WOsu.Skin(loc);
    var lt = this.loadedTextures = {};
    var textureList = WOsu.Skin.textureList;

    // Grab an array of texture names
    var textures = [];
    for (var i in textureList) {
        textures.push(i);
    }
    
    var total = textures.length;
    var loaded = 0;
    
    function localProgress(id, tex) {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        instance.textures[id] = tex;
        
        loaded++;

        progress(loaded, total);
    }
    
    textures.forEach(function(t) {
        THREE.ImageUtils.loadTexture(
            loc + textureList[t],
            undefined,
            function(tex) {
                localProgress(t, tex);
            },
            function(evt) {
                // Attempt to load default skin
                loc = WOsu.SkinLoader.defaultURL;
                THREE.ImageUtils.loadTexture(
                    loc + textureList[t],
                    undefined,
                    function(tex) {
                        localProgress(t, tex);
                    },
                    function(evt) {
                        localProgress(t, undefined);
                    }
                );
            }
        );
    });

    return instance;
}
//# sourceMappingURL=WOsu.js.map