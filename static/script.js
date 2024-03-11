var wineryService;
var wineryMarkers = [];
var defaultLocation;
let userwineries;
var clerk;

let isSearchAllowed = true;

console.log("key:" + googleMapsApiKey)



let infoWindow;

window.addEventListener('load', async function () {
    const ratingContainers = document.querySelectorAll('.winery-rating');

    ratingContainers.forEach(container => {
        const stars = container.querySelectorAll('.star');
        const placeId = container.getAttribute('data-place-id'); // Get the unique place_id of the winery

        stars.forEach(star => {
            star.addEventListener('click', function (e) {
                setRating(stars, placeId, e); // Pass the placeId to the setRating function
            });
        });
    });

    function setRating(stars, placeId, e) {
        const starValue = parseInt(e.currentTarget.getAttribute('data-value'), 10);
        stars.forEach(star => {
            star.classList.remove('rated');
            if (parseInt(star.getAttribute('data-value'), 10) <= starValue) {
                star.classList.add('rated');
            }
        });

        console.log(`Winery ${placeId} rated as ${starValue} stars.`); // Example action, replace with actual code to send rating to server or process it further
    }

    const radios = document.querySelectorAll('input[name="pinOptions"]');

    // Add a click event listener to each radio button
    radios.forEach(radio => {
        radio.addEventListener('click', function () {
            console.log(`Option selected: ${this.value}`);
            // Perform any other action you need when a radio is clicked

            searchForWineries();
        });
    });
});
function getInsetBounds(map, insetPercentage) {
    // Get the current bounds from the map
    const bounds = map.getBounds();

    // Extract the northeast and southwest corners of the bounds
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    // Calculate the differences for latitude and longitude
    const latDiff = ne.lat() - sw.lat();
    const lngDiff = ne.lng() - sw.lng();

    // Calculate insets based on the percentage
    const latInset = latDiff * insetPercentage / 100;
    const lngInset = lngDiff * insetPercentage / 100;

    // Adjust bounds to apply the inset
    const adjustedNE = { lat: ne.lat() - latInset, lng: ne.lng() - lngInset };
    const adjustedSW = { lat: sw.lat() + latInset, lng: sw.lng() + lngInset };

    // Create new bounds using the Google Maps API LatLngBounds class
    const newBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(adjustedSW.lat, adjustedSW.lng),
        new google.maps.LatLng(adjustedNE.lat, adjustedNE.lng)
    );

    return newBounds;
}

let map;

async function initMap() {
    // Request libraries when needed, not in the script tag.
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { Places } = await google.maps.importLibrary("places");
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

    // Short namespaces can be used.
    map = new Map(document.getElementById("map"), {
        mapId: "WINERY_MAP",
        center: defaultLocation, // Default location (initially undefined)
        zoom: 10, // Adjust the initial zoom level,
        mapTypeControl: true, // Enable map type control
        gestureHandling: 'greedy',
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DEFAULT, // Use default style for map type control
            mapTypeIds: [google.maps.MapTypeId.ROADMAP], // Only allow the roadmap type
        },
    });

    class CustomOverlay extends google.maps.OverlayView {
        constructor(position, content) {
          super();
          this.position = position;
          this.content = content;
          // Create a div to hold the content
          this.div = null;
        }

        /** Called when the overlay is added to the map. */
        onAdd() {
          this.div = document.createElement('div');
          this.div.className = 'custom-overlay';
          this.div.innerHTML = this.content;

          // Add the element to the overlay layer
          const panes = this.getPanes();
          panes.overlayLayer.appendChild(this.div);
        }

        /** Called when the overlay's location or content needs to be updated. */
        draw() {
          // Convert the LatLng position to pixel coordinates
          const projection = this.getProjection();
          const pixelPosition = projection.fromLatLngToDivPixel(this.position);

          // Position the div using the pixel coordinates
          this.div.style.left = pixelPosition.x + 'px';
          this.div.style.top = pixelPosition.y + 'px';
        }

        /** Called when the overlay is removed from the map. */
        onRemove() {
          if (this.div) {
            this.div.parentNode.removeChild(this.div);
            this.div = null;
          }
        }

        /** Show the overlay. */
        show() {
          if (this.div) {
            this.div.style.visibility = 'visible';
          }
        }

        /** Hide the overlay. */
        hide() {
          if (this.div) {
            this.div.style.visibility = 'hidden';
          }
        }
      }

    wineryService = new google.maps.places.PlacesService(map);

    infoWindow = new google.maps.InfoWindow();

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
    const minimumIntervalBetweenSearches = 5000; // Minimum time between consecutive searches

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

        console.log("pan/zoom occurred, search")

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

    ///////

    dataTable = $('#wineryTable').DataTable({ // Initialize DataTables
        "paging": true, // Enable paging
        "searching": false, // Enable searching
        "ordering": true, // Enable sorting
        "info": true, // Show table information
        "pageLength": 5,
        "lengthChange": false,
        columnDefs: [
            { targets: [0], width: '5%' },
            { targets: [1], width: '30%' },
            { targets: [2], width: '15%' },
            { targets: [3], width: '15%' },
            { targets: [4], width: '15%' },
            { targets: [5], width: '20%' }
        ],
        "createdRow": function (row, data, dataIndex) {
            // Initialize rateYo for each row in the 'Rating' column

            var readOnly = true;
            if (clerk.user) {
                readOnly = false
            }

            $('td', row).eq(5).find('.rateYo').rateYo({
                rating: 1, // Assuming your data source has a 'rating' key
                fullStar: true,
                starWidth: "16px",
                ratedFill: "#494277",
                //readOnly: readOnly,
                onSet: function (rating, rateYoInstance) {
                    var place_details = data[5]
                    console.log(place_details, rating);

                    if (clerk.user) {

                    }
                    else {
                        var msg = 'Please create an account or log in to use this feature.'

                        alert(msg);
                    }
                }
            });
        }
    });

    dataTable.clear().draw();

    adjustDataTableRows();

    // Adjust page length on window resize
    $(window).resize(function () {
        adjustDataTableRows();
    });



}

initMap();

function searchForWineries() {

    dataTable.clear().draw();

    // Clear existing winery markers
    wineryMarkers.forEach(function (marker) {
        marker.setMap(null);
    });
    wineryMarkers = [];

    function searchArea(keyword, bounds, callback) {
        var request = {
            bounds: bounds,
            keyword: keyword,
        };

        wineryService.nearbySearch(request, function (results, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                callback(null, results);
            } else {
                console.log("Search for " + keyword + " failed: " + status);
                callback("error", null);
            }
        });
    }


    const bounds = getInsetBounds(map, 5);

    /*
    const rectangle = new google.maps.Rectangle({
        bounds: bounds,
        strokeColor: '#FF0000', // Line color
        strokeOpacity: 0.8,     // Line opacity
        strokeWeight: 2,        // Line weight
        fillColor: '#FF0000',   // Fill color
        fillOpacity: 0.35,      // Fill opacity
        map: map,               // Map on which to display the rectangle
    });
    */

    var keywords = ['winery', 'vineyard', 'meadery'];

    async function searchAndFilter() {
        var allResults = [];

        for (const currentKeyword of keywords) {
            try {
                //console.log("Search for: " + currentKeyword);

                const results = await new Promise((resolve, reject) => {
                    searchArea(currentKeyword, bounds, function (error, results) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    });
                });

                //console.log(results);

                wineryNumber = 1

                // Filter out duplicates && non-food places
                results.forEach(function (result) {
                    if (!allResults.some(existingResult => existingResult.place_id === result.place_id) && (result.types.includes('food'))) {
                        result.wineryNumber = wineryNumber;
                        wineryNumber++

                        allResults.push(result);
                        //console.log("unique place found: " + result)
                    }
                });
            } catch (error) {
                console.log('Error:', error);
            }
        }

        return allResults;
    }

    searchAndFilter().then((allResults) => {
        // Access allResults here
        //console.log('All results:', allResults);

        processUserWineries().then(() => {
            allResults.forEach(function (place) {
                fetchPlaceDetails(place.place_id, function (details) {
                    try {
                        var link = '';

                        if (details.website) {
                            link = "<a href='" + details.website + "' target='_blank'>" + place.name + "<a/>"
                        }
                        else {
                            link = place.name
                        }

                        var place_details = { "place_id": place.place_id, "details": details, "place": place, "link": link }

                        createTableRow(place_details)
                        createPin(place_details)
                    }
                    catch (ex) {
                        console.log("error..........")
                    }
                });
            });
        })
            .catch(error => {
                console.error('Error calling processUserWineries:', error);
            });


    });
}

function createTableRow(place_details) {
    //console.log(place_details)

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

            //console.log(userplace)

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

    rating_HTML = "<div class='rateYo'></div>"

    idHolder = `<input type="hidden" class="row-id" value="${place_details.place.place_id}" />`

    wineryNumber = place_details.place.wineryNumber

    dataTable.row.add([wineryNumber, place_details.link, visited_checkboxHTML, favorited_checkboxHTML, wishlist_checkboxHTML, rating_HTML, place_details]).draw();

    //console.log(clerk.user);
    if (clerk.user) {
        var isVisitedChecked, isFavoritedChecked, isWishlistChecked;

        $(`#${visited_checkboxId}`).on('change', function () {
            isVisitedChecked = $(`#${visited_checkboxId}`).is(':checked');
            isFavoritedChecked = $(`#${favorited_checkboxId}`).is(':checked');
            isWishlistChecked = $(`#${wishlist_checkboxId}`).is(':checked');

            saveWinery(place_details, isVisitedChecked, isFavoritedChecked, isWishlistChecked);
        });

        $(`#${favorited_checkboxId}`).on('change', function () {
            isVisitedChecked = $(`#${visited_checkboxId}`).is(':checked');
            isFavoritedChecked = $(`#${favorited_checkboxId}`).is(':checked');
            isWishlistChecked = $(`#${wishlist_checkboxId}`).is(':checked');

            saveWinery(place_details, isVisitedChecked, isFavoritedChecked, isWishlistChecked);
        });

        $(`#${wishlist_checkboxId}`).on('change', function () {
            isVisitedChecked = $(`#${visited_checkboxId}`).is(':checked');
            isFavoritedChecked = $(`#${favorited_checkboxId}`).is(':checked');
            isWishlistChecked = $(`#${wishlist_checkboxId}`).is(':checked');

            saveWinery(place_details, isVisitedChecked, isFavoritedChecked, isWishlistChecked);
        });
    }
    else {
        var msg = 'Please create an account to use this feature.'

        $(`#${visited_checkboxId}`).on('click', function () {
            alert(msg);
        });

        $(`#${favorited_checkboxId}`).on('click', function () {
            alert(msg);
        });

        $(`#${wishlist_checkboxId}`).on('click', function () {
            alert(msg);
        });
    }
}

function createPin(place_details) {
    try {
        var pinColor;

        console.log(place_details);

        if (userwineries) {
            const userplace = userwineries.find(obj => obj.placeid === place_details.place.place_id);

            //console.log(userplace)

            if (userplace) {
                pinColor = "#32cd32"
            } else {
                pinColor = "#ff0000"
            }
        }
        else {
            pinColor = "#ff0000"
        }

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

        /*
         const pinBackground = new PinElement({
             background: '#494277',
             glyph: "",
         });
        */

        
        var contentString = '<div style="width:300px;"><h4 class="infoWindowTitle">' + place_details.link + '</h4></div>';
        contentString += '<p>' + dirLink + '</p>'
        contentString += '<p class="hours">' + hours + '</p>'
        

        const radios = document.querySelectorAll('input[name="pinOptions"]:checked').value;

        const selectedRadio = document.querySelector('input[name="pinOptions"]:checked');
        const selectedValue = selectedRadio ? selectedRadio.value : null;
        //console.log(selectedValue)

        var markerType = selectedValue

        let marker = google.maps.marker.AdvancedMarkerElement

        if (markerType == "Icons") {
            marker = new google.maps.marker.AdvancedMarkerElement({
                map: map,
                position: place_details.place.geometry.location,
                content: buildContent(place_details),
            });
        }
        else if (markerType == "Text") {
            const wineryTag = document.createElement("div");

            wineryTag.className = "winery-tag";
            wineryTag.textContent = place_details.place.name;

            marker = new google.maps.marker.AdvancedMarkerElement({
                map: map,
                position: place_details.place.geometry.location,
                content: wineryTag,
            });
        }

        marker.addListener("click", () => {
            // Update the InfoWindow content and open it on the marker
            infoWindow.setContent(contentString);
            infoWindow.open(map, marker);
        });

        wineryMarkers.push(marker)
    }
    catch (ex) {
        console.log("error", ex)
    }
}

function toggleHighlight(markerView, place_details) {
    if (markerView.content.classList.contains("highlight")) {
        markerView.content.classList.remove("highlight");
        markerView.zIndex = null;
    } else {
        markerView.content.classList.add("highlight");
        markerView.zIndex = 1;
    }
}

function buildContent(place_details) {
    const content = document.createElement("div");

    content.classList.add("winery");

    content.innerHTML = `
        <div class="markercontainer">
            <div class="winerynum">${place_details.place.wineryNumber}</div>
           
        </div>
      `;

    return content;
}

function saveWinery(place_details, isVisitedChecked, isFavoritedChecked, isWishlistChecked) {
    console.log("saveWinery: " + place_details.place.place_id, isVisitedChecked, isFavoritedChecked, isWishlistChecked);

    $.ajax({
        type: 'POST',
        url: '/saveWinery',
        data: {
            place_id: place_details.place.place_id,
            visited: isVisitedChecked,
            favorited: isFavoritedChecked,
            wishlist: isWishlistChecked,
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

function getUserWineries() {
    console.log("getUserWineries")
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
    if (clerk.user) {
        try {
            let data = await getUserWineries();

            console.log(data)

            userwineries = data;
            console.log('User Wineries:', userwineries);
        } catch (error) {
            console.error('Error while processing user wineries:', error);
        }
    }
    else {
        console.log("no user logged in, skip loading user wineries")
        return null
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


function adjustDataTableRows() {
    var landscapeModePageLength = 25; // Example: Show more rows in landscape
    var portraitModePageLength = 10;  // Example: Show fewer rows in portrait or smaller screens

    // Assuming a landscape mode is when the width is greater than the height
    var isLandscape = $(window).width() > $(window).height();
    var newPageLength = isLandscape ? landscapeModePageLength : portraitModePageLength;

    // Adjust the DataTable page length
    $('#wineryTable').DataTable().page.len(newPageLength).draw();
}

