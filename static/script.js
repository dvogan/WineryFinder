var wineryService;
var wineryMarkers = [];
var defaultLocation; // Will be set to the user's location
let userwineries;
var rawResults = []
var placesDetails = [];
var currentInfowindow = null;
var extendedBounds;
var clerk;

console.log("key:" + googleMapsApiKey)

// Global definition of CustomInfoWindow
function CustomInfoWindow() {
    google.maps.InfoWindow.call(this);
    // Additional customization
}
//CustomInfoWindow.prototype = new google.maps.InfoWindow();
//CustomInfoWindow.prototype.constructor = CustomInfoWindow;

// Function to print the screen size
function printScreenSize() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    console.log("Width: " + width + "px, Height: " + height + "px");
}

// Event listener for window resize/orientation change
//window.addEventListener('resize', printScreenSize);

// Adds listener to initialize ClerkJS after it's loaded
window.addEventListener('load', async function () {
    clerk = window.Clerk;

    console.log("clerk.user: " + clerk.user)

    var auth_link = document.getElementById('auth_link');
    var myWineriesLink = this.document.getElementById('myWineriesLink')

    if (clerk.user) {
        processUserWineries();

        window.Clerk.mountUserButton(auth_link, {
            appearance: {
                baseTheme: 'dark'
            },
            afterSignOutUrl: "/"
        });
        auth_link.textContent = "";
    }
    else {
        auth_link.addEventListener('click', function (event) {
            // Prevent default action of the link
            event.preventDefault();

            window.Clerk.openSignIn(auth_link, {
                appearance: {
                    baseTheme: 'dark'
                }
            });
        });

        myWineriesLink.style.display = 'none';
    }
});

function getUserWineries() {
    console.log(clerk.user.id)

    return fetch('/getUserWineries?user=' + clerk.user.id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            // Return data for further processing if needed
            return data;
        })
        .catch(error => {
            console.error('Error:', error);
            // It's important to re-throw the error so it can be caught by the caller
            throw error;
        });
}

async function processUserWineries() {
    try {
        let data = await getUserWineries();

        console.log(data)

        userwineries = data;
        console.log('User Wineries:', userwineries);
    } catch (error) {
        console.error('Error while processing user wineries:', error);
    }
}

async function updatePin(place_details) {
    try {
        console.log("look for marker")

        wineryMarkers.forEach(function (marker) {
            console.log(marker);
            if (marker.place_id == place_details.place.place_id) {
                console.log("found marker");
                marker.setMap(null);
                //createWineryMarker(place_details)
            }
        });

    } catch (error) {
        console.error('Error while processing user wineries:', error);
    }
}

let map;
// initMap is now async
async function initMap() {
    // Request libraries when needed, not in the script tag.
    const { Map } = await google.maps.importLibrary("maps");
    const { Places } = await google.maps.importLibrary("places");
    // Short namespaces can be used.
    map = new Map(document.getElementById("map"), {
        center: defaultLocation, // Default location (initially undefined)
        zoom: 10, // Adjust the initial zoom level,
        mapTypeControl: true, // Enable map type control
        gestureHandling: 'greedy',
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DEFAULT, // Use default style for map type control
            mapTypeIds: [google.maps.MapTypeId.ROADMAP], // Only allow the roadmap type
        },
    });

    wineryService = new google.maps.places.PlacesService(map);


    console.log(navigator.geolocation)

    // Check if geolocation is available in the user's browser
    if (navigator.geolocation) {
        // Get the user's current location
        navigator.geolocation.getCurrentPosition(function (position) {
            var userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            defaultLocation = userLocation; // Set the defaultLocation to the user's location

            console.log(defaultLocation);
            map.setCenter(defaultLocation); // Set the map center to the location
            searchForWineries(); // Perform initial search

        }, function () {
            console.log("geolocation failed");
            // Handle errors if geolocation fails
            defaultLocation = { lat: 41.642, lng: -80.147 }; // Default location (Meadville PA)

            console.log(defaultLocation);
            map.setCenter(defaultLocation); // Set the map center to the location
            searchForWineries(); // Perform initial search
        });
    } else {
        console.log("geolocation not available");
        // Geolocation is not available, use the default location
        defaultLocation = { lat: 41.642, lng: -80.147 }; // Default location (Meadville PA)

        console.log(defaultLocation);
        map.setCenter(defaultLocation); // Set the map center to the location
        searchForWineries(); // Perform initial search
    }



    ///////
    var mapFullyLoaded = false; // Flag to track if the map has finished loading
    var lastSearchTime = 0;
    var debounceTimer = null;
    const searchDelay = 500; // Delay before considering an interaction as finished
    const minimumIntervalBetweenSearches = 1000; // Minimum time between consecutive searches

    function attemptSearchForWineries() {
        var currentTime = Date.now();
        // Check if sufficient time has passed since the last search
        if (currentTime - lastSearchTime > minimumIntervalBetweenSearches) {
            searchForWineries();
            lastSearchTime = currentTime;
        }
    }

    function debounceSearchForWineries() {
        if (!mapFullyLoaded) return; // Ignore events until the map is fully loaded

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            attemptSearchForWineries();
        }, searchDelay);
    }

    // Listen for the map to be fully loaded
    map.addListener('tilesloaded', function () {
        mapFullyLoaded = true; // Set the flag to true once the map tiles are loaded
    });

    // Setup event listeners
    map.addListener('dragend', debounceSearchForWineries);
    map.addListener('zoom_changed', debounceSearchForWineries);
    // Optionally, if you decided to include 'idle', add it in a similar way
    map.addListener('idle', debounceSearchForWineries);

    ///////


}

initMap();

dataTable = $('#wineryTable').DataTable({ // Initialize DataTables
    "paging": true, // Enable paging
    "searching": true, // Enable searching
    "ordering": true, // Enable sorting
    "info": true, // Show table information
    "pageLength": 5,
    "lengthChange": false,
    columnDefs: [
        { targets: [0], width: '40%' },
        { targets: [1], width: '15%' },
        { targets: [2], width: '15%' },
        { targets: [3], width: '15%' },
        { targets: [4], width: '15%' },
    ]
});

dataTable.clear().draw();

function searchForWineries() {

    dataTable.clear().draw();

    // Clear existing winery markers
    wineryMarkers.forEach(function (marker) {
        marker.setMap(null);
    });
    wineryMarkers = [];

    // Get the current bounds
    var currentBounds = map.getBounds();

    function searchArea(keyword, bounds, callback) {
        var request = {
            bounds: bounds,
            keyword: keyword,
        };

        wineryService.nearbySearch(request, function (results, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                console.log(results)
                callback(null, results);
            } else {
                console.log("Search for " + keyword + " failed: " + status);
                callback(null,null);
            }
        });
    }

    ////////////////////////
    var keywords = ['winery', 'vineyard', 'meadery'];
    var bounds = currentBounds; // replace with your actual bounds object

    async function searchAndFilter() {
        var allResults = [];

        for (const currentKeyword of keywords) {
            try {
                const results = await new Promise((resolve, reject) => {
                    searchArea(currentKeyword, bounds, function (error, results) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    });
                });

                // Filter out duplicates
                results.forEach(function (result) {
                    if (!allResults.some(existingResult => existingResult.place_id === result.place_id)) {
                        allResults.push(result);
                        console.log("unique place found: " + result)
                    }
                });
            } catch (error) {
                console.log('Error:', error);
            }
        }

        console.log('All results:', allResults);

        return allResults;
    }

    searchAndFilter().then((allResults) => {
        // Access allResults here
        console.log('All results:', allResults);
        processSearchResults(allResults)
    });


}

var allPlaces = {}; // Object to store unique places

function processSearchResults(results) {
    results.forEach(function (place) {
        //console.log(place.types)
        //console.log(allPlaces);
        if (place.types.includes('food')) {
            processPlace(place);
        }
    });
}



function processPlace(place) {
    fetchPlaceDetails(place.place_id, function (details) {
        place_details = { "place_id": place.place_id, "details": details, "place": place }

        placesDetails.push(place_details)

        displayPlace(place_details)
    });
}

function displayPlace(place_details) {
    //console.log("displayPlace");
    var link = '';

    //console.log(place_details)

    if (place_details.details.website) {
        link = "<a href='" + place_details.details.website + "' target='_blank'>" + place_details.place.name + "<a/>"
    }
    else {
        link = place_details.place.name
    }

    createTableRow(link, place_details)

    var pinColor;

    if (userwineries) {
        if (userwineries.includes(place_details.place.place_id)) {
            pinColor = "#32cd32"
        } else {
            pinColor = "#ff0000"
        }
    }
    else {
        pinColor = "#ff0000"
    }

    //console.log(pinColor)

    var pinLabel = "A";
    var pinSVGHole = "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z";
    var labelOriginHole = new google.maps.Point(12, 15);
    var pinSVGFilled = "M 12,2 C 8.1340068,2 5,5.1340068 5,9 c 0,5.25 7,13 7,13 0,0 7,-7.75 7,-13 0,-3.8659932 -3.134007,-7 -7,-7 z";
    var labelOriginFilled = new google.maps.Point(12, 9);
    var markerImage = {
        path: pinSVGFilled,
        anchor: new google.maps.Point(12, 17),
        fillOpacity: 1,
        fillColor: pinColor,
        strokeWeight: 2,
        strokeColor: "#000000",
        scale: 2,
        labelOrigin: labelOriginFilled
    };

    marker = new google.maps.Marker({
        map: map,
        position: place_details.place.geometry.location,
        icon: markerImage,
        title: place_details.place.name,
        place_id: place_details.place.place_id
    });

    lat = place_details.place.geometry.location.lat()
    lng = place_details.place.geometry.location.lng()

    dirURL = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    dirLink = `<a href='${dirURL}' target='_blank'><img class='navIcon' src='/static/maps-icon-16.png'></a>`;

    //console.log(dirLink)

    var hours = "";
    try {
        hours = place_details.details.opening_hours.weekday_text.join('<br>')
    }
    catch (ex) {

    }

    var contentString = '<div style="width:300px;"><h4 class="infoWindowTitle">' + link + '</h4></div>';
    contentString += '<p>' + dirLink + '</p>'
    contentString += '<p class="hours">' + hours + '</p>'


    var infoWindow = new google.maps.InfoWindow();
    infoWindow.setContent(contentString);



    marker.addListener('click', function () {
        // Close the current InfoWindow if it's open
        if (currentInfowindow) {
            currentInfowindow.close();
        }

        infoWindow.setPosition(marker.getPosition());
        infoWindow.setMap(map);

        currentInfowindow = infoWindow;
    });

    wineryMarkers.push(marker);
}

function createTableRow(link, place_details) {
    var encodedID = place_details.place.place_id.replace(/ /g, '_');

    var visited_checkboxId = 'visited_checkbox_' + encodedID;
    var favorited_checkboxId = 'favorited_checkbox_' + encodedID;
    var wishlist_checkboxId = 'wishlist_checkbox_' + encodedID;

    visited = ""
    favorited = ""
    wishlist = ""

    if (clerk.user) {
        if (userwineries) {
            const userplace = userwineries.find(obj => obj.placeid === place_details.place.place_id);

            console.log(userplace)

            if (userplace) {
                if (userplace.visited) {
                    visited = "checked"
                }

                if (userplace.favorite) {
                    favorited = "checked"
                }

                if (userplace.wishlist) {
                    wishlist = "checked"
                }
            }
            else {
                console.log("no user data for this place")
            }
        }
    }

    visited_checkboxHTML = `<input type="checkbox" name="visited_placeCheckbox" id="${visited_checkboxId}" value="${place_details.place.place_id}" ${visited}>`;
    favorited_checkboxHTML = `<input type="checkbox" name="favorited_placeCheckbox" id="${favorited_checkboxId}" value="${place_details.place.place_id}" ${favorited}>`;
    wishlist_checkboxHTML = `<input type="checkbox" name="wishlist_placeCheckbox" id="${wishlist_checkboxId}" value="${place_details.place.place_id}" ${wishlist}>`;

    dataTable.row.add([link, visited_checkboxHTML, favorited_checkboxHTML, wishlist_checkboxHTML, "rate..."]).draw();

    //console.log(clerk.user);
    if (clerk.user) {
        $(`#${visited_checkboxId}`).on('change', function () {
            var isChecked = $(this).is(':checked');

            saveWinery(place_details, isChecked);
        });
    }
    else {
        $(`#${visited_checkboxId}`).on('click', function () {
            event.preventDefault();

            // Call the alert function
            alert('Please create an account to use this feature.');
        });
    }
}

function saveWinery(place_details, state) {
    console.log("saveWinery: " + place_details.place.place_id);

    $.ajax({
        type: 'POST',
        url: '/saveWinery',
        data: {
            place_id: place_details.place.place_id,
            checkbox_state: state,
            user: clerk.user.id
        },
        success: function (response) {
            console.log('Flask route response:', response);

            processUserWineries();
            updatePin(place_details)
        },
        error: function (error) {
            console.error('Error:', error);
        }
    });
}

function fetchPlaceDetails(placeId, callback) {
    fetch(`/get-place-details?place_id=${placeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.details) {
                callback(data.details); // Call the callback with the website URL
            } else {
                console.error('Error:', data.error);
                callback('N/A'); // Handle the case where there is no website URL
            }
        })
        .catch(error => {
            console.error('Error:', error);
            callback('N/A'); // Handle errors and return 'N/A'
        });
}
