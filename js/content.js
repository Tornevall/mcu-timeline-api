var $ = jQuery.noConflict();
var currentCategoryChoice;
var includeFilm;
var includeTv;
var finder = '';
var lastSearch = '';
var finderTimeout;
var mcuApiUrl = 'https://api.earth616.org/api/mcu';
/**
 * Film and TV-series list container.
 * @type {{}}
 */
var mcuData = {};
var mcuCategoryList = [];
/**
 * List of categories retrieved from the API, and which CID (index) they have.
 * This has been added after the first release of this sample and has been used to
 * utilize the speed of loading (by loading categories first).
 * @type {{}}
 */
var mcuCategoryIndexes = {};
var dataDownloaded = [];
var lastDownloadedTimelineEntry = '';
var lastTimelineEntryDate = '';

function getNewContent() {
    $.ajax(
        {
            method: 'GET',
            url: mcuApiUrl + '/latest?limit=1'
        }
    ).done(
        function (d) {
            if (typeof d[0] !== "undefined") {
                lastTimelineEntryDate = d[0]['updated'];
                if (lastDownloadedTimelineEntry === '') {
                    lastDownloadedTimelineEntry = lastTimelineEntryDate;
                } else if (lastTimelineEntryDate !== lastDownloadedTimelineEntry) {
                    $('#timeLineStatus').html('Entry updates discovered.');
                    getDataByIndexes();
                    lastDownloadedTimelineEntry = lastTimelineEntryDate;
                }
            }
        }
    ).fail(function (faildata) {
        getCentralFail(faildata);
    });
}

/**
 * Get new refreshed data by the primary category indexes.
 */
function getDataByIndexes() {
    $('#timeLineStatus').html('Entry updates discovered.');
    for (var categoryName in mcuCategoryIndexes) {
        cIdx = mcuCategoryIndexes[categoryName];
        if (cIdx > 0) {
            $.ajax(
                {
                    url: mcuApiUrl + '/timeline/category/' + cIdx,
                    method: "GET",
                    dataType: 'json'
                }
            ).done(
                function data(mcuDataResponse) {
                    var mcuDataObject = mcuDataResponse['mcuTimeLine'][Object.keys(mcuDataResponse['mcuTimeLine'])[0]];
                    $('#timeLineStatus').html("Updated " + Object.keys(mcuDataResponse['mcuTimeLine'])[0]);
                    mcuData[Object.keys(mcuDataResponse['mcuTimeLine'])[0]] = mcuDataObject;
                }
            ).fail(function (faildata) {
                getCentralFail(faildata);
            });
        }
    }
}

/**
 * Initialize API update.
 */
function getApiContent() {
    $('#timeLineStatus').html('Initializing API.');
    setInterval('getNewContent()', 5000);
    $('#loader').html($('<img>', {src: 'images/loadingio_wedges_64.gif', border: "none"}));

    $.ajax(
        {
            url: mcuApiUrl + '/categories',
            method: "GET",
            dataType: 'json'
        }
    ).done(
        function (data) {
            var categoryIndexes = [];
            for (var categoryIndex in data) {
                mcuData[data[categoryIndex]['category']] = [];
                categoryIndexes.push(data[categoryIndex]['cid']);
                mcuCategoryIndexes[data[categoryIndex]['category']] = data[categoryIndex]['cid'];
            }
            $('#timeLineStatus').html('Fetching categories...');

            mcuCategoryList = getCategories();
            getTable('all');

            for (var categoryName in mcuCategoryIndexes) {
                cIdx = mcuCategoryIndexes[categoryName];
                if (cIdx > 0) {
                    $.ajax(
                        {
                            url: mcuApiUrl + '/timeline/category/' + cIdx,
                            method: "GET",
                            dataType: 'json'
                        }
                    ).done(
                        function data(mcuDataResponse) {
                            var mcuDataObject = mcuDataResponse['mcuTimeLine'][Object.keys(mcuDataResponse['mcuTimeLine'])[0]];
                            var categoryId = parseInt($(mcuDataObject).first()[0]['cid']);
                            $('#timeLineStatus').html('Downloaded category ' + categoryId + '.');
                            $('#mcuTableLoading_' + mcuCategoryIndexes[Object.keys(mcuDataResponse['mcuTimeLine'])[0]]).remove();
                            dataDownloaded.push(categoryId);
                            mcuData[Object.keys(mcuDataResponse['mcuTimeLine'])[0]] = mcuDataObject;
                            if ($('span[id^=mcuTableLoading]').length === 0) {
                                $('#timeLineStatus').html('');
                                $('#find').prop('readonly', false);
                                $('#find').removeClass('findReadOnly');
                                var queryString = window.location.search;
                                const urlParams = new URLSearchParams(queryString);
                                if (urlParams.get('find') !== '') {
                                    $('#find').val(urlParams.get('find'));
                                    findit();
                                }
                            }
                        }
                    ).fail(function (faildata) {
                        getCentralFail(faildata);
                    });
                }
            }
        }
    ).fail(function (faildata) {
        getCentralFail(faildata);
    });
}

function getCentralFail(faildata) {
    if (typeof faildata.responseText !== 'undefined') ;
    {
        var parseError = JSON.parse(faildata.responseText);
        $('#timeLineStatus').html('API Fail: ' + parseError.error.message);
    }
}

/**
 * Handler for the search function.
 */
function findit() {
    finder = $('#find').val();
    if (finder !== '') {
        lastSearch = finder;
        clearTimeout(finderTimeout);
        finderTimeout = setTimeout(
            function () {
                getTable('all_search')
            },
            400
        );
    } else if (finder === '' && lastSearch !== '') {
        if (currentCategoryChoice === 'all_search') {
            currentCategoryChoice = 'all';
        }
        lastSearch = '';
        getTable(currentCategoryChoice);
    }
}

/**
 * List only tv/film matches.
 */
function checkMcuChoice() {
    checkMcuOptions();
    if (!includeFilm && !includeTv) {
        $('#includeFilm').click();
    }
    getTable(currentCategoryChoice);
}

/**
 * Update variables for including TV/Film
 */
function checkMcuOptions() {
    includeFilm = $('#includeFilm').is(":checked");
    includeTv = $('#includeTv').is(":checked");
}

/**
 * Autoloader for tables.
 * @param request
 */
function getTable(request) {
    checkMcuOptions();
    currentCategoryChoice = request;

    $('#mcuTable').hide().html(generateTable(request)).fadeIn('slow')
}

/**
 * Definitions on how to handle requests.
 * @param request
 * @returns {*|jQuery|HTMLElement}
 */
function generateTable(request) {
    switch (request) {
        default:
            // Default shows everything.
            return getRenderedTable(request);
    }
}

/**
 * Get a list with all categories in the MCU API.
 * @returns {*[]}
 */
function getCategories() {
    var list = [];

    var mcuDataSorted = Object.keys(mcuData).sort();
    for (var category in mcuDataSorted) {
        list.push(mcuDataSorted[category]);
    }

    return list;
}

/**
 * Get film/tv-list based on the category name.
 * @param categoryKey
 * @returns {*[]}
 */
function getListByKey(categoryKey) {
    var list = [];
    for (var category in mcuData) {
        if (category === categoryKey || categoryKey === 'all_search') {
            if (categoryKey !== 'all_search') {
                list = mcuData[category];
                break;
            } else {
                for (var keyIndex in mcuData[category]) {
                    list.push(mcuData[category][keyIndex]);
                }
            }
        }
    }

    return list;
}

/**
 * Open "card" with information.
 * @param id
 */
function getContentDetails(id) {
    $('#info_' + id).toggle('medium');
}

/**
 * MCU Table is clicked.
 * @param o
 */
function getClickedRequest(o) {
    getTable(o.innerText);
}

/**
 * Search for content in arrays.
 *
 * @param value
 * @param arrayObject
 * @returns {boolean}
 */
function valueIn(value, arrayObject) {
    var result = false;
    for (var i = 0; i < arrayObject.length; i++) {
        if (typeof arrayObject[i] === 'object') {
            $.each(arrayObject[i], function (item, itemValue) {
                if (itemValue.toLowerCase().indexOf(value.toLowerCase()) > -1) {
                    result = true;
                }
            });
        } else if (typeof arrayObject[i] === 'string') {
            if (arrayObject[i].indexOf(value.toLowerCase(), arrayObject[i].toLowerCase())) {
                result = true;
                break;
            }
        }
    }

    return result;
}

/**
 * Decide whether there is a search result or not, when finder is no empty.
 * @param contentData
 * @returns {boolean}
 */
function getContentByFinder(contentData) {
    checkMcuOptions();

    // If there is no search string, allow always.
    if (finder.trim() === '' || finder === '*') {
        return true;
    }

    var returnBySearch = false;
    var actorCache = {};
    var actorCacheEpisode = {};

    if (finder !== '' && typeof contentData !== 'undefined') {
        try {
            actorCache = typeof contentData["imdbcache"]["actor"] === 'object' ? contentData["imdbcache"]["actor"] : {};
        } catch (e) {
        }
        try {
            actorCacheEpisode = typeof contentData["imdbepisode"]["actor"] !== "undefined" && typeof contentData["imdbepisode"]["actor"] === 'object' ? contentData["imdbepisode"]["actor"] : {};
        } catch (e) {
        }

        if (typeof actorCache === 'object' && Array.isArray(actorCache) && valueIn(finder, actorCache)) {
            return true;
        }
        if (typeof actorCacheEpisode === 'object' && Array.isArray(actorCacheEpisode) && valueIn(finder, actorCacheEpisode)) {
            return true;
        }

        for (var contentKey in contentData) {
            if (typeof contentData[contentKey] === 'string' &&
                contentData[contentKey].toLowerCase().indexOf(finder.toLowerCase()) > -1
            ) {
                returnBySearch = true;
                break;
            }
        }
    }

    return returnBySearch;
}

/**
 * Render content table.
 * @param request
 * @returns {*|jQuery|HTMLElement}
 */
function getRenderedTable(request) {
    var jqueryTable = $('<div id="mcuContainer">');
    var renderHtml;

    if (typeof mcuCategoryList === 'undefined' || !mcuCategoryList.length) {
        $('#tooFast').html('You have to wait. Still loading data!');
        return;
    }
    $('#tooFast').html('');
    $('#loader').html('');

    switch (request) {
        case 'all':
            var mcuCid = 0;
            var loadingHtml = '';
            for (var i = 0; i < mcuCategoryList.length; i++) {
                mcuCid = parseInt(mcuCategoryIndexes[mcuCategoryList[i]]);

                if (!dataDownloaded.includes(mcuCid)) {
                    loadingHtml = $(
                        '<span>',
                        {
                            id: 'mcuTableLoading_' + mcuCid, class: 'secondLoader'
                        }
                    ).html(
                        $('<img>', {
                            src: 'images/loadingio_gear_32.gif',
                            'border': 0
                        })
                    );
                } else {
                    loadingHtml = '';
                }

                renderHtml = $('<div>', {
                    id: 'mcuTable_' + mcuCid,
                    class: 'clickable alert alert-success',
                    click: function () {
                        getClickedRequest(this)
                    }
                }).html(
                    $('<div>').html(mcuCategoryList[i])
                        .append(
                            loadingHtml
                        )
                );
                jqueryTable.append(renderHtml);
            }
            break;
        default:
            var contentList = getListByKey(request);
            var contentData;

            for (var listId = 0; listId < contentList.length; listId++) {
                contentData = contentList[listId];

                if (!getContentByFinder(contentData)) {
                    continue;
                }
                if (contentData["tv"] === "1" && !includeTv) {
                    continue;
                }
                if (contentData["tv"] === "0" && !includeFilm) {
                    continue;
                }

                renderHtml = $(
                    '<div>',
                    {
                        id: 'mcuid_' + contentData.mcuid,
                    }
                ).html(
                    $('<li>', {
                        class: 'list-group-item clickable'
                    }).html(getNewContentElement(contentData))
                );
                jqueryTable.append(
                    $('<ul>', {id: 'list_' + contentData.mcuid}).html(renderHtml)
                );
            }
    }

    return jqueryTable;
}

/**
 * Return data from the IMDB cache.
 * @param key
 * @param imdbData
 * @returns {string}
 */
function getImdbDataByKey(key, imdbData) {
    var returnedData = '';

    var useCache = 'imdbcache';
    if (imdbData["tv"] === 1) {
        useCache = 'imdbepisode';
    }

    if (null !== imdbData[useCache] && typeof imdbData[useCache][key] !== 'undefined') {
        returnedData = imdbData["imdbcache"][key];
    }

    return returnedData;
}

/**
 * @param contentData
 * @link https://docs.tornevall.net/pages/viewpage.action?pageId=82018337
 */
function getNewContentElement(contentData) {
    var apiContent = {
        'mcuid': 0,
        'title': '',
        'premiere': '',
        'mcutime': '',
        'animated': '',
        'tv': '',
        'imdb': '',
        'imdbepisode': '',
        'contentinformation': {},
        'postcredits': {},
        'notes': {},
        'imdbcache': {},
        'imdbepisodecache': {},
        'keywords': '',
        'distribution': '',
        'description': 'imdb',
        'image': 'imdb',
        'actor': 'imdb',
        'season': '',
        'episode': '',
        'phase': '',
        'category': '',
        'links': []
    };

    for (var contentKey in apiContent) {
        switch (contentKey) {
            case 'notes':
            case 'postcredits':
                // Make sure these variables are empty between each round.
                apiContent[contentKey] = [];
                break;
            case 'tv':
                apiContent[contentKey] = contentData[contentKey] === "1" ? 'TV Series' : 'Film';
                break;
            case 'mcutime':
                apiContent[contentKey] = contentData[contentKey] !== '' ? contentData[contentKey] : '-- Not known yet or not applicable.';
                break;
            default:
                if (apiContent[contentKey] !== 'imdb') {
                    apiContent[contentKey] = typeof contentData[contentKey] !== 'undefined' && contentData[contentKey] !== '' ? contentData[contentKey] : 'N/A';
                } else {
                    apiContent[contentKey] = getImdbDataByKey(contentKey, contentData);
                }
        }
    }

    if (null !== apiContent["contentinformation"]) {
        if (typeof apiContent["contentinformation"]["Post"] !== "undefined") {
            apiContent["postcredits"] = apiContent["contentinformation"]["Post"];
        }
        if (typeof apiContent["contentinformation"]["Notes"] !== "undefined") {
            apiContent["notes"] = apiContent["contentinformation"]["Notes"];
        }
    }

    var postCreditData = getStringifiedArray(apiContent["postcredits"], apiContent["mcuid"], 'Post Credit Scene Notes');
    var contentNotes = getStringifiedArray(apiContent["notes"], apiContent["mcuid"], 'Content Notes');
    var distribution = getBadge('distribution', apiContent, apiContent["distribution"], 'badge-dark');
    var episodeData = null;

    if (parseInt(apiContent["season"]) === 1) {
        var episodeStringify = 'S' + apiContent["season"].padStart(2, '0') + 'E' + apiContent["episode"].padStart(2, '0');
        episodeData = getBadge('seasonData', apiContent, episodeStringify, 'badge-primary');
    }
    if (parseInt(apiContent["phase"]) > 0) {
        var phase = getBadge('phase', apiContent, 'Phase ' + apiContent["phase"], 'badge-info');
    } else {
        var phase = $('<span>', {}).html('');
    }

    var cardBadges = $('<span>', {
        id: 'cb_' + apiContent["mcuid"],
        class: 'cardBadges'
    }).append(episodeData).append(phase).append(distribution);

    var useTitle = $('<span>', {
        id: 'title_' + apiContent["mcuid"],
        class: 'mcu_title'
    }).html(apiContent["title"]);

    var usePremiere = $('<span>', {
        id: 'premiere_' + apiContent["mcuid"],
        class: 'mcu_premire'
    }).html(' (' + apiContent["premiere"] + ')');

    useTitle.append(usePremiere);

    var returnThis = $('<div>').html(
        $('<div>', {
            class: 'mcu_title',
            id: 'mcu_title_' + apiContent["mcuid"],
            click: function () {
                getContentDetails(apiContent["mcuid"])
            }
        }).html(useTitle)
            .prepend(cardBadges)
    );

    var imdbLink = '';

    if (apiContent["imdb"] !== '' && apiContent["imdb"].indexOf('http') > -1) {
        imdbLink = $('<a>', {href: apiContent["imdb"], class: 'badge badge-primary', target: '_blank'}).html('IMDB');
    }
    if (typeof imdbLink === 'function' && apiContent["imdbepisode"] !== '' && contentData["tv"] === "1") {
        imdbLink
            .html(
                $('<div>').html(
                    $('<a>', {
                        href: apiContent["imdbepisode"],
                        class: 'badge badge-primary',
                        target: '_blank'
                    }).html('IMDB - S' + apiContent["season"] + "E" + apiContent["episode"])
                )
            )
    }

    var linkArray = getLinks(apiContent);
    var linkArrayClass = linkArray !== null ? 'linkArray' : '';

    var hiddenContent = $('<div>', {id: 'info_' + apiContent["mcuid"], style: 'display:none'})
        .append(
            $('<div>', {class: 'mcu_description'}).html(apiContent["description"])
        )
        .append(
            $('<div>', {class: 'mcu_premiere badge badge-light'})
                .html(
                    "Events takes place, MCU Time, " + apiContent["mcutime"] + "."
                )
        )
        .append($('<div>').html(postCreditData))
        .append($('<div>').html(contentNotes))
        .append($('<div>').html(imdbLink))
        .append($('<div>', {class: linkArrayClass}).html(linkArray));

    return returnThis.append(hiddenContent);
}

/**
 * Extract links from API response.
 * @param mcuObject
 */
function getLinks(mcuObject) {
    if (typeof mcuObject.links === 'object' && mcuObject.links !== null) {
        var returnObject = $('<div>');
        var url;
        var hrefElement;
        for (var i = 0; i < mcuObject.links.length; i++) {
            url = mcuObject.links[i];
            if (url.indexOf('www.youtube.com') > -1) {
                hrefElement = getYoutube(url);
                returnObject.append(hrefElement);
            } else {
                hrefElement = $('<a>',
                    {
                        'target': '_blank',
                        'href': url
                    }
                );
                hrefElement.html('Read more at ' + extractDomain(url) + '.');
                returnObject.append(hrefElement)
            }
        }
    } else {
        returnObject = null;
    }
    return returnObject;
}

/**
 * Create youtube element for MCU titles.
 * @param url
 * @returns {*|jQuery|HTMLElement}
 */
function getYoutube(url) {
    var youtubeMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);

    var useUrl = '';
    if (youtubeMatch && youtubeMatch[2].length == 11) {
        useUrl = 'https://www.youtube.com/embed/' + youtubeMatch[2];
    }

    if (useUrl === '') {
        throw 'Bad Youtube URL';
    }

    return $('<iframe>', {
        width: 560,
        height: 315,
        src: useUrl,
        title: 'Watch on youtube!',
        frameBorder: 0,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
    });
}

/**
 * Return a proper badge for specific data in the mcuDataContainer.
 * @param key
 * @param data
 * @param text
 * @param badgeClass
 * @returns {*|jQuery}
 */
function getBadge(key, data, text, badgeClass) {
    return $('<span>', {
        id: key + '_' + data['mcuid'],
        class: 'badge ' + badgeClass + ' ' + key,
    }).html(text)
}

/**
 * Stringify content like post credit notes and regular notes from a movie/tv-show.
 * @param contentArray
 * @param mcuid
 * @param typeName
 * @returns {*|jQuery|HTMLElement}
 */
function getStringifiedArray(contentArray, mcuid, typeName) {
    var returnStringified = $('<div>', {id: typeName + '_' + mcuid});

    if (contentArray.length > 0) {
        var render = $('<div>', {class: 'stringifiedTitle'}).html(typeName);
        returnStringified.append(render);
        for (var i = 0; i < contentArray.length; i++) {
            render = $('<div>', {
                id: typeName + '_' + mcuid + '_' + i,
                class: 'stringifiedText'
            }).html(contentArray[i]);
            returnStringified.append(render);
        }
    }
    return returnStringified;
}

/**
 * Extract domain name for use with a hrefs.
 * @param url
 * @returns {*}
 * @link https://codepen.io/martinkrulltott/pen/GWWWQj
 */
function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    } else {
        domain = url.split('/')[0];
    }

    //find & remove www
    if (domain.indexOf("www.") > -1) {
        domain = domain.split('www.')[1];
    }

    domain = domain.split(':')[0]; //find & remove port number
    domain = domain.split('?')[0]; //find & remove url params

    return domain;
}
