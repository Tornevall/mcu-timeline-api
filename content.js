var $ = jQuery.noConflict();
var currentCategoryChoice;
var includeFilm;
var includeTv;
var finder = '';
var lastSearch = '';
var finderTimeout;

function getApiContent() {
    $('#loader').html($('<img>', {src: "./Jumbotron-Wedges-3s-64px.gif", border: "none"}));
    $.ajax(
        {
            url: mcuApiUrl,
            method: "GET",
            dataType: 'json'
        }
    ).done(
        function (data) {
            $('#find').prop('readonly', false);
            mcuData = data.mcuTimeLine;
            mcuCategoryList = getCategories();
            getTable('all');
        }
    );
}

function findit() {
    finder = $('#find').val();
    if (finder !== '') {
        lastSearch = finder;
        clearTimeout(finderTimeout);
        finderTimeout = setTimeout(
            function () {
                getTable('all_search')
            },
            1000
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
    includeFilm = $('#includeFilm').is(":checked");
    includeTv = $('#includeTv').is(":checked");

    if (!includeFilm && !includeTv) {
        $('#includeFilm').click();
    }
    getTable(currentCategoryChoice);
}

/**
 * Autoloader for tables.
 * @param request
 */
function getTable(request) {
    includeFilm = $('#includeFilm').is(":checked");
    includeTv = $('#includeTv').is(":checked");
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

function getListByKey(categoryKey) {
    var list = [];
    for (var category in mcuData) {
        if (category === categoryKey || categoryKey === 'all_search') {
            if (categoryKey !== 'all_search') {
                list = mcuData[category];
                break;
            } else {
                Object.assign(list, mcuData[category]);
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

function getClickedRequest(o) {
    getTable(o.innerText);
}

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

function getContentByFinder(contentData) {
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
    if (finder === '') {
        returnBySearch = true;
    }

    return returnBySearch;
}

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
            for (var i = 0; i < mcuCategoryList.length; i++) {
                renderHtml = $('<div>', {
                    id: 'mcuTable',
                    class: 'clickable alert alert-success',
                    click: function () {
                        getClickedRequest(this)
                    }
                }).html(
                    mcuCategoryList[i]
                );
                jqueryTable.append(renderHtml);
            }
            break;
        default:
            var contentList = getListByKey(request);
            var contentData;

            for (var listId = 0; listId < contentList.length; listId++) {
                contentData = contentList[listId];

                if (contentData["tv"] === "1" && !includeTv) {
                    continue;
                }
                if (contentData["tv"] === "0" && !includeFilm) {
                    continue;
                }
                if (!getContentByFinder(contentData)) {
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
        'distribution': '',
        'description': 'imdb',
        'image': 'imdb',
        'actor': 'imdb',
        'season': '',
        'episode': '',
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

    var returnThis = $('<div>').html(
        $('<div>', {
            class: 'mcu_title', click: function () {
                getContentDetails(apiContent["mcuid"])
            }
        }).html(apiContent.title + ' (' + apiContent["premiere"] + ')')
            .append($('<div>', {class: 'badge badge-dark distribution'}).html(apiContent["distribution"]))
    );

    var imdbLink = '';

    if (apiContent["imdb"] !== '') {
        imdbLink = $('<a>', {href: apiContent["imdb"], class: 'badge badge-primary', target: '_blank'}).html('IMDB');
    }

    if (apiContent["imdbepisode"] !== '' && contentData["tv"] === "1") {
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
        .append($('<div>').html(imdbLink));

    return returnThis.append(hiddenContent);
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