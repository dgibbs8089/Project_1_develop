// This js displays recommended games given 3 inputs: platform, genre, and keywords.
$(document).ready(function () {

    var PAGE_SIZE_STRING = "10"; // number of suggestions for user
    var PagesProcessed = 0; // keep track of number of pages processed so far, so we can do synchronous work
    var SAVE_INFO_KEY = "save_info_games"; //key to local storage
    var listOfPlatforms = []; //used to display the list of platforms
    var listOfGenres = []; // //used to display the list of genres
    var listOfGames = []; // call RAWG to get this list
    var listOfChickens = []; // this is the one that will display the data

    // helper to pass by reference primitive variables
    var searchCriteriaSelect = {
        genreval: "",
        platval: "",
        searchval: "",

        selectedgenre: false, // 
        selectedplatform: false,
        selectedsearch: false
    };

    // if the user clicked Search, do something different than if the user clicked a recently searched
    var clickedSearchButton = false;

    // info needed when created recently searched for buttons
    var searchObject = {
        namesearched: "",
        platformsearched: undefined,
        platdescription: "",
        genresearched: undefined,
        genredescription: "",
        key: ""
    };

    var platformObject = {
        id: 0,
        name: "",
        pagenum: 1
    };

    var genreObject = {
        id: 0,
        name: "",
        pagenum: 1
    };

    // use in chickenCoopObject. Info from RAWG.
    var gamesObject = {
        id: 0,
        name: "",
        pic: "",
        index: 0,
        released: ""
    };

    // Info gotten from ChickenCoop API
    var chickenCoopDataObject = {
        games: gamesObject,
        description: "",
        genre: [],
        image: "",
        publisher: [],
        rating: "",
        releaseDate: "",
        score: 0,
        title: ""
    };

    // stuff and keys needed to call APIs
    var rapidKey = "a2b5d3b684mshabbf5412b1d3507p11b0a1jsnd2cd92016a40";
    var RAWGHost = "rawg-video-games-database.p.rapidapi.com";
    var queryURLRAWGPlatform = "https://rapidapi.p.rapidapi.com/platforms?";

    var queryGamesRAWG = "https://rapidapi.p.rapidapi.com/games?page_size=" + PAGE_SIZE_STRING; 
    var queryURLRAWGGenre = "https://rapidapi.p.rapidapi.com/genres?";
    var chickenCoopURL = "https://rapidapi.p.rapidapi.com/games/";

    var headerParams = {
        "x-rapidapi-key": rapidKey,
        "x-rapidapi-host": "chicken-coop.p.rapidapi.com"
    }

    var headerParamsRAWG = {
        "x-rapidapi-key": rapidKey,
        "x-rapidapi-host": RAWGHost
    }

    // display platform to screen
    function displayPlatformToScreen() {

        var controlPlatform = $("#platformid");

        for (var i = 0; i < listOfPlatforms.length; i++) {
            var option = $("<option>");
            option.text(listOfPlatforms[i].name);
            option.val(listOfPlatforms[i].name);
            option.attr("data-id", listOfPlatforms[i].id);
            option.appendTo(controlPlatform);
        }

    }

    // display to screen
    function displayGenreToScreen() {

        var controlGenre = $("#genreid");

        for (var i = 0; i < listOfGenres.length; i++) {
            var option = $("<option>");
            option.text(listOfGenres[i].name);
            option.val(listOfGenres[i].name);
            option.attr("data-id", listOfGenres[i].id);
            option.appendTo(controlGenre);
        }
    }

    // get local storage function
    function getLocalStorageFunc() {
        var getlocalstorage = JSON.parse(localStorage.getItem(SAVE_INFO_KEY));

        if (getlocalstorage === null) {
            getlocalstorage = [];
        }

        return getlocalstorage;
    }

    // populate the most recent searches list
    function PopulateLastSearches() {
        var recentul = $("#recentSearchedUL");
        var gotlocal = getLocalStorageFunc();
        recentul.empty();

        for (var i = 0; i < gotlocal.length; i++) {
            var item = gotlocal[i];
            var button = $("<button>");
            var listitem = $("<li>");

            var key = item.key;
            if (key !== undefined && key !== "") {
                button.attr("data-key", key);
                button.addClass("recentlySearchedClass");
                button.bind("click", searchRecentButton);
                var splitted = key.split(',');
                button.text("Error");
                var messageOnButton = "";

                if (splitted.length > 2) {

                    var namedescript = gotlocal[i].namesearched;
                    var genredescript = gotlocal[i].genredescription;
                    var platdescript = gotlocal[i].platdescription;

                    if (namedescript === "") {
                        namedescript = "No title";
                    }

                    if (genredescript === "") {
                        genredescript = "No genre";
                    }

                    if (platdescript === "") {
                        platdescript = "No platform";
                    }

                    messageOnButton += namedescript + ", " + genredescript + ", " + platdescript;
                    button.text(messageOnButton);
                }


                button.appendTo(listitem);
                listitem.appendTo(recentul);
            }
        }
    }

    // stuff that is common to searching, either by Search button or most recently searched button
    function commonToSearch() {
        var getul = $(".section1");
        getul.empty();
        PagesProcessed = 0;
    }

    // Come here after clicking a most recently searched button
    function searchRecentButton(event) {
        event.preventDefault();
        commonToSearch();
        var gotdata = $(this).attr("data-key");
        var splitted = gotdata.split(',');
        // get list of searches

        var searchCriteria = Object.create(searchCriteriaSelect);

        searchCriteria.searchval = splitted[0];
        searchCriteria.genreval = splitted[1];
        searchCriteria.platval = splitted[2];

        buildGamesURLHelper(searchCriteria);

        getListOfGames(splitted[0], splitted[1], splitted[2],
            searchCriteria.selectedsearch, searchCriteria.selectedgenre, searchCriteria.selectedplatform);
    }

    // trying to DRY code, use this helper if you need to do any more type of searching.
    // searchCriteria is just an object used to pass by reference which criteria were used.
    function buildGamesURLHelper(searchCriteria) {

        if (searchCriteria.searchval !== "") {
            searchCriteria.selectedsearch = true;
        }
        if (searchCriteria.genreval !== "undefined") {
            searchCriteria.selectedgenre = true;
        }
        if (searchCriteria.platval !== "undefined") {
            searchCriteria.selectedplatform = true;
        }
    }

    // call this to get list of recommendations
    function searchButtonClicked(event) {
        event.preventDefault();
        clickedSearchButton = true;
        commonToSearch();

        // gather inputs
        var searchGuy = $("#searchid").val().trim();
        var searchControl = $("#searchid");
        searchControl.removeClass("errorSign");
        var errordiv = $("#errorDiv");
        errordiv.text("");

        var genreGuy = $("#genreid :selected").attr("data-id");
        var platformGuy = $("#platformid :selected").attr("data-id");

        selectedsearch = false;
        selectedplatform = false;
        selectedgenre = false;

        if (searchGuy !== "") {
            selectedsearch = true;
        }
        if (genreGuy !== undefined) {
            selectedgenre = true;
        }
        if (platformGuy !== undefined) {
            selectedplatform = true;
        }

        if (!selectedsearch && !selectedgenre && !selectedplatform) {
            searchControl.addClass("errorSign");

            errordiv.text("Enter at least one search parameter");

            return;
        }

        getListOfGames(searchGuy, genreGuy, platformGuy, selectedsearch, selectedgenre, selectedplatform);
    }

    // call API to get games
    function getListOfGames(search, genres, platforms, selectedsearch, selectedgenre, selectedplatform) {
        var geturl = buildGamesURL(search, genres, platforms, selectedsearch, selectedgenre, selectedplatform);

        $.ajax({
            url: geturl,
            method: "GET",
            headers: headerParamsRAWG

        }).then(calledGetGames)
            .then(getChickenCoopInfo);
    }

    // save to local storage
    function saveLocalStorage() {

        var getobjectArray = getLocalStorageFunc();

        var getobject = Object.create(searchObject);
        var searched = $("#searchid");

        var genreGuy = $("#genreid :selected");
        var platformGuy = $("#platformid :selected");

        var datag = genreGuy.attr("data-id");
        var datap = platformGuy.attr("data-id");

        getobject.namesearched = searched.val().trim();
        getobject.genresearched = datag;

        getobject.genredescription = $("#genreid :selected").val();
        getobject.platformsearched = datap;

        getobject.platdescription = $("#platformid :selected").val();

        getobject.key = getobject.namesearched + "," + getobject.genresearched + "," + getobject.platformsearched;

        getobjectArray.unshift(getobject);

        if (getobjectArray.length > 3) {
            getobjectArray.pop();
        }

        localStorage.setItem(SAVE_INFO_KEY, JSON.stringify(getobjectArray));
    }

    // the 2nd then of getGames from RAWG 
    // as you loop through, the chicken coop API gets called asynchronously
    function getChickenCoopInfo() {
        for (var i = 0; i < listOfGames.length; i++) {
            var item = listOfGames[i];
            var name = item.name;
            CallChickenCoop(name);
        }
    }

    // call the ChickenCoop API
    function CallChickenCoop(nameOfTheVideoGame) {
        var queryURL = buildURL(nameOfTheVideoGame);
        $.ajax({
            url: queryURL,
            method: "GET",
            headers: headerParams
        }).then(calledCC);
    }

    // the "then" of having called the ChickenCoop API
    // this function gets popped off the stack as program control returns
    function calledCC(response) {
        var item = response.result;
        PagesProcessed++;

        if (item !== null && !item.toString().includes("No result")) {
            var gotdata = Object.create(chickenCoopDataObject);
            var itemgames = findGame(item.title);

            gotdata.games = itemgames; // could be null

            gotdata.description = item.description;
            gotdata.genre = item.genre;
            gotdata.image = item.image;
            gotdata.publisher = item.publisher;
            gotdata.rating = item.rating;
            gotdata.score = item.score;
            gotdata.title = item.title;

            listOfChickens.push(gotdata);

            populateUsingCriteria(gotdata);
        }

        // you're done popping off the stack. Do processing that goes after
        if (PagesProcessed >= listOfGames.length) {
            if (clickedSearchButton) {
                saveLocalStorage();
                PopulateLastSearches();
                clickedSearchButton = false;
            }

            var searchid = $("#searchid");
            searchid.val("");
        }
    }

    // the then of having called RAWG games
    function calledGetGames(response) {
        var result = response.results;
        listOfGames = [];
        for (var i = 0; i < result.length; i++) {
            var item = result[i];
            var gamesObject1 = Object.create(gamesObject);
            gamesObject1.id = item.id;
            gamesObject1.name = item.name;
            gamesObject1.released = item.released;
            if (item.clip !== null) {
                gamesObject1.pic = item.clip.clip;
            }

            gamesObject1.index = i; // put into chickenCoop when ready
            listOfGames.push(gamesObject1);
        }
    }

    // RAWG games url
    function buildGamesURL(search, genres, platforms, selectedsearch, selectedgenre, selectedplatform) {

        var url = queryGamesRAWG;

        if (selectedsearch) {
            url += "&search=" + search;
        }

        if (selectedgenre) {
            url += "&genres=" + genres;
        }

        if (selectedplatform) {
            url += "&platforms=" + platforms;
        }

        return url;
    }

    // call API that gets platforms
    function getListOfPlatforms(platformurl) {
        $.ajax({
            url: platformurl,
            method: "GET",
            headers: headerParamsRAWG
        }).then(calledGetPlatforms);
    }

    // the then of getPlatforms
    function calledGetPlatforms(response) {
        var result = response.results;

        for (var i = 0; i < result.length; i++) {
            var item = result[i];
            var platformObject1 = Object.create(platformObject);
            platformObject1.id = item.id;
            platformObject1.name = item.name;

            listOfPlatforms.push(platformObject1);
        }

        if (response.next !== null) {
            getListOfPlatforms(queryURLRAWGPlatform + "page=2");
        }

        // have to do this due to asynchronous programming of js
        if (response.next === null) {
            displayPlatformToScreen();
        }
    }

    // get genres from RAWG
    function getListOfGenres(genreurl) {
        $.ajax({
            url: genreurl,
            method: "GET",
            headers: headerParamsRAWG
        }).then(calledGetGenres);
    }

    // the then of getGenres
    function calledGetGenres(response) {
        var result = response.results;

        for (var i = 0; i < result.length; i++) {
            var item = result[i];
            var genreObject1 = Object.create(genreObject);
            genreObject1.id = item.id;
            genreObject1.name = item.name;

            listOfGenres.push(genreObject1);
        }

        displayGenreToScreen();
    }

    // build chickenCoop url
    function buildURL(nameOfTheVideoGame) {
        var sampleVideo = "Rise of the Tomb Raider";
        var encoded = nameOfTheVideoGame; //encodeURIComponent(/*sampleVideo*/ nameOfTheVideoGame);
        var queryURL = chickenCoopURL + encoded + "?";
        return queryURL;
    }

    // this bridges the gap between RAWG and ChickenCoop: search for the name of the game
    function findGame(chickenTitle) {
        var game = null;
        for (var i = 0; i < listOfGames.length; i++) {

            if (listOfGames[i].name.includes(chickenTitle)) {
                game = listOfGames[i];
                break;
            }
        }

        return game;
    }

    // populate results
    function populateUsingCriteria(gotdata) {

        section = $(".section1");

        var video = $("<video>");
        var image = $("<img>");
        image.addClass("img");

        var card = $("<card>");
        card.addClass("card");

        var descriptionli = $("<p>");
        var ratingli = $("<h5>");
        var divTitle = $("<h4>");
        var pScore = $("<h5>");


        var name = "";
        var pic = "";
        var description = "";
        var rating = "";

        if (gotdata.games !== null) {
            name = gotdata.games.name;
            pic = gotdata.games.pic;
        }

        if (gotdata.description !== null) {
            description = gotdata.description;
            description = description.replace(/(&quot;)|(&hellip;  Expand)|(&amp;)/g, "");
        }

        if (gotdata.rating !== null) {
            rating = gotdata.rating;
        }

        if (gotdata.image !== null) {
            image.attr("src", gotdata.image);
            image.attr("alt", "image of game");
        }

        divTitle.text("Title: " + name);
        divTitle.attr("style", "margin-top: 10px;");
        descriptionli.text("Description: " + description);
        ratingli.text("Rating: " + rating);
        pScore.text("Score: " + gotdata.score);


        // append to card
        if (pic !== "") {
            video.attr("src", pic);
            video.attr("width", 220);
            video.attr("height", 200);
            video.attr("controls", "controls");
            video.appendTo(card);
        }

        divTitle.appendTo(card);
        ratingli.appendTo(card);
        pScore.appendTo(card);
        image.appendTo(card);
        descriptionli.appendTo(card);

        card.appendTo(section);
    }

    $("#searchNow").on("click", searchButtonClicked);
    getListOfPlatforms(queryURLRAWGPlatform);
    getListOfGenres(queryURLRAWGGenre);
    PopulateLastSearches();
});
