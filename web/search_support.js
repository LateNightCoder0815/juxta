// Provides basic search functionality for juxta
// Must be included _after_ the dropdown selector on the web page

searchConfig = {
    defaultSearchImage: false,
    defaultSearchPath: false,
    defaultSearchMeta: true,
    defaultSearchMode: 'infix', // Possible values: prefix, infix
    defaultCaseSensitive: false,

    minQueryLength: 1,
    maxMatches: 1000,
    overlayOpacity: 0.4,
    overlayColor: "#000000",
    // Return a SVG element used for visually marking boxes with content matching a search
    createMarkerMask: function(x, y, width, height, lineWidth) {
        // We're creating part of a mask (black = visible, white = blocked. Gradients possible!
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Clipping_and_masking
        return'<rect x="{0}" y="{1}" width="{2}" height="{3}" style="fill:#000000" />\n'.format(x, y, width, height);
    },
    // Return a SVG element used for visually marking boxes that has been manually marked
    createManualMarker: function(x, y, width, height, lineWidth) {
        // As opposed to the createMarkerMask, this is not part of a mask
        return'<rect x="{0}" y="{1}" width="{2}" height="{3}" style="fill:none;stroke-width:{4};stroke:#ffff00" />\n'.format(x, y, width, height, lineWidth*6);
    }
}

// https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
String.prototype.format = function() {
    var formatted = this;
    for (var i = 0; i < arguments.length; i++) {
        var regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

var jprops = overlays.jprops;
var rawAspectRatio = (jprops.rowCount*jprops.rawH)/(jprops.colCount*jprops.rawW);

var svgBase = null;
var svg = null;
var svgString = '';
var homeBounds = null;
var aspectRatio = null;
var relativeLineWidth = null;
function createSVGOverlay() {
    homeBounds = myDragon.viewport.getHomeBounds();
    relativeLineWidth = 0.01 * 1 / Math.min(jprops.colCount, jprops.rowCount);
    /* Must be before the svg so that it is positioned underneath */
    svg = document.createElement("div");
    svg.id = "svg-overlay";
    myDragon.addOverlay({
        element: svg,
//        location: homeBounds
        location: new OpenSeadragon.Rect(homeBounds.x, homeBounds.y, homeBounds.width, homeBounds.height*rawAspectRatio)
    });
    svgString = '';
    svgBase = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;z-index:1;margin:0;padding:0;top:0;left:0;width:100%;height:100%" viewBox="{0} {1} {2} {3}">\n'.format(homeBounds.x, homeBounds.y, homeBounds.width, homeBounds.height*rawAspectRatio);
}
createSVGOverlay();

function clearSVGOverlay() {
    svgString = '';
    svg.innerHTML = svgBase + '</svg>';
}
//console.log("HomeBounds: " + JSON.stringify(myDragon.viewport.getHomeBounds()));

function updateSVGOverlay(svgXML) {
    svgString += svgXML;
    var svgFinal = '';
    svgFinal += svgBase;
    svgFinal += '<defs>\n'
    svgFinal += '<mask id="multi-clip">\n';
    svgFinal += '<rect x="0" y="0" width="1" height="{0}" style="fill:rgba(255, 255, 255, 100)" />\n'.format(rawAspectRatio);
    svgFinal += svgString;
    svgFinal += '</mask>\n'
    svgFinal += '</defs>\n';
    svgFinal += '<rect x="{0}" y="{1}" width="{2}" height="{3}" style="fill:{4}" opacity="{5}" mask="url(#multi-clip)" />\n'.format(homeBounds.x, homeBounds.y, homeBounds.width, homeBounds.height*rawAspectRatio, searchConfig.overlayColor, searchConfig.overlayOpacity);
    svgFinal += svgManualMarkers;
    svgFinal += '</svg>';
    svg.innerHTML = svgFinal;
}

function addBoxes(boxIDs) {
    var svgBoxes = '';
    for (var i = 0 ; i < boxIDs.length; i++) {
        svgBoxes += getBox(boxIDs[i]);
    }
    updateSVGOverlay(svgBoxes);
}
function addBox(boxID) {
    updateSVGOverlay(getBox(boxID));
}
function getBox(boxID) {
    x = boxID % jprops.colCount;
    y = Math.floor(boxID / jprops.colCount);
    boxW = 1 / jprops.colCount;
    boxH = 1 / jprops.rowCount;
 
//    xFactor = homeBounds.width+homeBounds.x;
//    yFactor = homeBounds.height+homeBounds.y;
    
//    console.log("box={0], x={1}, y={2}, xFactor={3}, yFactor={4}".format(boxID, x, y, xFactor, yFactor));
    //boxW *= xFactor;
    //boxH *= yFactor;
    x = x / jprops.colCount;
    y = y / jprops.rowCount * rawAspectRatio;
    boxH *= rawAspectRatio;
    
    return searchConfig.createMarkerMask(x, y, boxW, boxH, relativeLineWidth);
}

for (var i = 0 ; i < 15 ; i++) {
    for (var j = 0 ; j < 15 ; j++) {
     //   addBox(i*14+(j*3));
    }
}

//updateSVGOverlay('<rect x="-2.125" y="0" width="4" height="4" style="fill:transparent;stroke-width:0.1;stroke:#ffffff" />\n')
//updateSVGOverlay('<rect x="-1.46" y="0" width="13" height="19" style="fill:transparent;stroke-width:0.1;stroke:#00ffff" />\n')
    
function clearSearch() {
    console.log("Clearing previous search result")
    clearSVGOverlay();
    searchMatchesElement.innerHTML = '';
}

// Returns { matchCount: int, matches: [index*] }
function searchAndDisplay(query, searchImage = searchConfig.defaultSearchImage, searchPath = searchConfig.defaultSearchPath, searchMeta = searchConfig.defaultSearchMeta, searchMode = searchConfig.defaultSearchMode, caseSensitive = searchConfig.defaultCaseSensitive) {
    clearSearch();
    var result = simpleSearch(query, searchImage, searchPath, searchMeta, searchMode, caseSensitive);
    addBoxes(result.matches);
    if (searchMatchesElement) {
        searchMatchesElement.innerHTML = result.matchCount + ' hits';
    }
    return result;
}

// Returns { matchCount: int, matches: [index*] }
function simpleSearch(query, searchImage = searchConfig.defaultSearchImage, searchPath = searchConfig.defaultSearchPath, searchMeta = searchConfig.defaultSearchMeta, searchMode = searchConfig.defaultSearchMode, caseSensitive = searchConfig.defaultCaseSensitive) {
    var metaCache = overlays.metaCache[0];
    if (metaCache.status != 'ready') {
        console.error("Error: Cannot perform search for '" + query + "' as no overlays.metaCache is available");
        return
    }
    if (metaCache.source != "0_0.json") {
        console.error("Error: overlays.metaCache[0].source == '" + metaCache.source + "'. It should be '0_0.json'. Make sure to set ASYNC_META_SIDE to more than the number of horizontal and vertical images in the collage when rendering");
        return;
    }
    console.log("Searching for '" + query + "'");
        
    var matches = [];
    var matchCount = 0;
    var queryL = caseSensitive ? query : query.toLowerCase();
    for (var index = 0 ; index < metaCache.meta.length ; index++) {
        var full = metaCache.meta[index];
        if (jprops.metaIncludesOrigin) {
            // TODO: Move pre- and post-fix to the json metadata files
            var path = metaCache.prefix + full.split('|')[0] + metaCache.postfix;
            var last = path.lastIndexOf("/");
            var image = last == -1 ? path : path.substr(last+1);
                
            // TODO: Create a better splitter that handles multiple |
            var meta = full.split('|')[1];
        } else {
            meta = full;
        }
        if (typeof(meta) == 'undefined') { // Happens for single images without metadata
            meta = '';
        }
        if (!caseSensitive) {
            path = path.toLowerCase();
            image = image.toLowerCase();
            meta = meta.toLowerCase();
        }

        
        if ((searchImage && ((searchMode == 'prefix' && image.startsWith(queryL)) || (searchMode == 'infix' && image.includes(queryL)))) ||
            (searchPath && ((searchMode == 'prefix' && path.startsWith(queryL)) || (searchMode == 'infix' && path.includes(queryL)))) ||
            (searchMeta && ((searchMode == 'prefix' && meta.startsWith(queryL)) || (searchMode == 'infix' && meta.includes(queryL))))) {
            matchCount++;
            if (matchCount <= searchConfig.maxMatches) {
                matches.push(index);
             }
        }
    }
    console.log("Got " + matchCount + " matches for query '" + query + "'");
    return { matchCount: matchCount, matches: matches };
}

var typeCallback = null;
function typeEventHandler(e) {
    var query = e.target.value;

    // Cancel previously issued query
    if (typeCallback != null) {
        window.cancelAnimationFrame(typeCallback);
    }
    if (fixedSearchElement) {
        fixedSearchElement.selectedIndex = 0;
    }
    
    typeCallback = window.requestAnimationFrame(function(timestamp) {
        if (query.length < searchConfig.minQueryLength) {
            clearSearch();
        } else {
            searchAndDisplay(query);
        }
    });
}
    
var fixedSearchElement =  document.getElementById('fixed_search');
var freeSearchElement =  document.getElementById('free_search');
var searchMatchesElement = document.getElementById('search_matches');
function enableSearch() {
    // Optional drop down with predefined searches
    if (fixedSearchElement) {
        fixedSearchElement.selectedIndex = 0;
        console.log("Enabling predefined searches");
        fixedSearchElement.onchange = function() {
            if (this.value == 'clear') {
                clearSearch();
                if (freeSearchElement) {
                    freeSearchElement.value = '';
                }
            } else {
                searchAndDisplay(this.value);
                if (freeSearchElement) {
                    freeSearchElement.value = this.value;
                }
            }
        }
    } else {
        console.log("Unable to locate select-element 'fixed_search': Predefined searches will not be available");
    }
    if (freeSearchElement) {
        console.log("Enabling user defined searches");
        freeSearchElement.value = '';
        freeSearchElement.addEventListener('input', typeEventHandler);
        freeSearchElement.addEventListener('propertychange', typeEventHandler); // for IE8
    } else {
        console.log("Unable to locate input-element 'free_search': User defined searches will not be available");
    }
}
enableSearch();

// ---------------------------------------------------------------------------------------------------------------
// Manual mark support below
// ---------------------------------------------------------------------------------------------------------------

var svgManualMarkers = '';
function createSVGManualMarkerOverlay() {
    svgManualMarkers = document.createElement("div");
    svgManualMarkers.id = "svg-manual-marker-overlay";
    myDragon.addOverlay({
        element: svgManualMarkers,
        location: new OpenSeadragon.Rect(homeBounds.x, homeBounds.y, homeBounds.width, homeBounds.height*rawAspectRatio)
    });
}
createSVGManualMarkerOverlay();

function updateSVGManualMarkerOverlay(markerXML) {
    var svgFinal = '';
    svgFinal += svgBase;
    svgFinal += markerXML;
    svgFinal += '</svg>';
//    console.log(svgFinal);
    svgManualMarkers.innerHTML = svgFinal;
}

var manualMarkers = {};

refreshManualMarkerSVG = function() {
    markerXML = '';
    for (var markerID in manualMarkers) {
        markerXML += manualMarkers[markerID];
    }
    updateSVGManualMarkerOverlay(markerXML);
}

exportManualMarkers = function() {
    if (!jprops.metaIncludesOrigin) {
        console.error("Unable to export selected images as metadata does not include origin");
        return;
    }
    var metaCache = overlays.metaCache[0];
    if (metaCache.status != 'ready') {
        console.error("Error: Cannot export manual markers as no overlays.metaCache is available");
        return
    }
    if (metaCache.source != "0_0.json") {
        console.error("Error: overlays.metaCache[0].source == '" + metaCache.source + "'. It should be '0_0.json'. Make sure to set ASYNC_META_SIDE to more than the number of horizontal and vertical images in the collage when rendering");
        return;
    }

    console.log("Listing " + Object.keys(manualMarkers).length + " manually selected images:");
    for (var markerID in manualMarkers) {
        [rawX, rawY] = markerID.split('_');
        var index = Number(rawY)*jprops.colCount+Number(rawX);
        var full = metaCache.meta[index];
        var path = metaCache.prefix + full.split('|')[0] + metaCache.postfix;
        console.log(path);
    }
}

handleMark = function(rawX, rawY) {
    var markerID = rawX + '_' + rawY;

    boxW = 1 / jprops.colCount;
    boxH = 1 / jprops.rowCount;
 
    x = rawX / jprops.colCount;
    y = rawY / jprops.rowCount * rawAspectRatio;
    boxH *= rawAspectRatio;

    if (manualMarkers[markerID]) {
        delete manualMarkers[markerID];
    } else {
        manualMarkers[markerID] = searchConfig.createManualMarker(x, y, boxW, boxH, relativeLineWidth);
    }
    refreshManualMarkerSVG();
}    

manualClick = function (e) {
    if (e.button != 2) {
        return;
    }
    handleMark(currentImageGridX(), currentImageGridY());
}
manualKey = function (e) {
    e = e.originalEvent;
    console.log(e.keyCode);
    switch (e.keyCode) {
    case 67: // c
        manualMarkers = {};
        refreshManualMarkerSVG();
        break;
    case 69: // e
        exportManualMarkers();
        break;
    case 77: // m
        handleMark(overlays.result.x, overlays.result.y);
        break;
    }
}
function enableManualMark() {
    myDragon.addHandler('canvas-nonprimary-press', manualClick);
    myDragon.addHandler('canvas-key', manualKey);
    overlays.dragonbox.addEventListener('contextmenu', event => event.preventDefault());
}
//enableManualMark();