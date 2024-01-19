var map;
var wineryService;
var wineryMarkers = [];
var defaultLocation; // Will be set to the user's location
let userwineries;
var websites=[];
var currentInfowindow = null;
var extendedBounds;

// Function to print the screen size
function printScreenSize() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    alert("Width: " + width + "px, Height: " + height + "px");
}

// Event listener for window resize/orientation change
window.addEventListener('resize', printScreenSize);

// Call the function initially to display the size on load
printScreenSize();


function getUserWineries() {
    return fetch('/getUserWineries', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        userwineries = data.wineries;
        console.log('User Wineries:', userwineries);

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
        // Continue processing with the data
        console.log('Processing User Wineries:', data.wineries);
    } catch (error) {
        console.error('Error while processing user wineries:', error);
    }
}

async function updatePin(place) {
    try {
        let data = await getUserWineries();
        userwineries=data.wineries

        console.log("look for marker")

        wineryMarkers.forEach(function (marker) {
            console.log(marker);
            if(marker.place_id == place.place_id) {
               console.log("found marker");
               marker.setMap(null);
               createWineryMarker(place)
            }
        });

    } catch (error) {
        console.error('Error while processing user wineries:', error);
    }
}

function initMap() {
   map = new google.maps.Map(document.getElementById('map'), {
       center: defaultLocation, // Default location (initially undefined)
       zoom: 10, // Adjust the initial zoom level,
       mapTypeControl: true, // Enable map type control
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DEFAULT, // Use default style for map type control
            mapTypeIds: [google.maps.MapTypeId.ROADMAP], // Only allow the roadmap type
        },
   });


   processUserWineries();
   
   wineryService = new google.maps.places.PlacesService(map);

   dataTable = $('#wineryTable').DataTable({ // Initialize DataTables
        "paging": true, // Enable paging
        "searching": true, // Enable searching
        "ordering": true, // Enable sorting
        "info": true, // Show table information
        columnDefs: [
            { targets: [0], width: '10%' }, 
            { targets: [1], width: '90%' }, 
        ]
    });
    dataTable.clear().draw();

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
           map.setCenter(defaultLocation); // Set the map center to the user's location
           searchForWineries(); // Perform initial search
       }, function () {
            console.log("geolocation failed");
           // Handle errors if geolocation fails
           defaultLocation = { lat: 37.7749, lng: -122.4194 }; // Default location (San Francisco)
           map.setCenter(defaultLocation); // Set the map center to the default location
           searchForWineries(); // Perform initial search
       });
   } else {
        console.log("geolocation not available");
       // Geolocation is not available, use the default location
       defaultLocation = { lat: 37.7749, lng: -122.4194 }; // Default location (San Francisco)
       map.setCenter(defaultLocation); // Set the map center to the default location
       searchForWineries(); // Perform initial search
   }

   // Add an event listener for map dragging (panning)
   map.addListener('dragend', function () {
       logCoordinates();
       searchForWineries();
   });

   map.addListener('zoom_changed', function () {
        // Handle zoom change here
        var zoomLevel = map.getZoom();
        console.log('Zoom Level:', zoomLevel);

        logCoordinates();
        searchForWineries();
    });
}

function logCoordinates() {
   var center = map.getCenter();
   console.log('Map Center Coordinates: Lat ' + center.lat() + ', Lng ' + center.lng());
}

function extendBounds(bounds, paddingLat, paddingLng) {
    // Northeast corner
    var ne = bounds.getNorthEast();
    var extendedNE = new google.maps.LatLng(ne.lat() + paddingLat, ne.lng() + paddingLng);

    // Southwest corner
    var sw = bounds.getSouthWest();
    var extendedSW = new google.maps.LatLng(sw.lat() - paddingLat, sw.lng() - paddingLng);

    // Create new extended bounds
    var extendedBounds = new google.maps.LatLngBounds(extendedSW, extendedNE);
    return extendedBounds;
}

function searchForWineries() {

    dataTable.clear().draw();

   // Clear existing winery markers
   wineryMarkers.forEach(function (marker) {
       marker.setMap(null);
   });
   wineryMarkers = [];

   

    // Get the current bounds
    var currentBounds = map.getBounds();

    // Define padding (latitude and longitude)
    var paddingLat = -0.1; // Example padding in degrees latitude
    var paddingLng = -0.1; // Example padding in degrees longitude

    // Extend the bounds
    extendedBounds = extendBounds(currentBounds, paddingLat, paddingLng);

    searchAndProcess('winery', extendedBounds);
    searchAndProcess('vineyard', extendedBounds);

   
}

var allPlaces = {}; // Object to store unique places

function processSearchResults(results) {
    results.forEach(function (place) {
        if (!allPlaces.hasOwnProperty(place.place_id)) {
            console.log(place.name);
            console.log(place);

            allPlaces[place.place_id] = place; // Store the place using its place_id
            createWineryMarker(place); // Assuming this function creates markers
            processPlace(place); // Your function to process the place data
        }
    });
}

function searchAndProcess(keyword,bounds) {
    var request = {
        bounds: bounds,
        keyword: keyword,
    };

    wineryService.nearbySearch(request, function (results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            processSearchResults(results);
        } else {
            console.log("Search for " + keyword + " failed: " + status);
        }
    });
}


function createWineryMarker(place) {
    var pinColor;

    if (userwineries.includes(place.place_id )) {
        pinColor="#32cd32"
    } else {
        pinColor="#ff0000"
    }

    //console.log(pinColor)
    
    var pinLabel = "A";
    var pinSVGHole = "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z";
    var labelOriginHole = new google.maps.Point (12,15);
    var pinSVGFilled = "M 12,2 C 8.1340068,2 5,5.1340068 5,9 c 0,5.25 7,13 7,13 0,0 7,-7.75 7,-13 0,-3.8659932 -3.134007,-7 -7,-7 z";
    var labelOriginFilled = new google.maps.Point (12,9);
    var markerImage = {
        path: pinSVGFilled,
        anchor: new google.maps.Point (12,17),
        fillOpacity: 1,
        fillColor: pinColor,
        strokeWeight: 2,
        strokeColor: "#000000",
        scale: 2,
        labelOrigin: labelOriginFilled
    };

    marker = new google.maps.Marker ( {
        map: map,
        position: place.geometry.location,
        icon: markerImage,
        title: place.name,
        place_id: place.place_id
    });

    lat=place.geometry.location.lat()
    lng=place.geometry.location.lng()

    dirURL=`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    dirLink=`<a href='${dirURL}' target='_blank'><img class='navIcon' src='/static/maps-icon-16.png'></a>`;

    //console.log(dirLink)

   var contentString = '<div><h4>' + place.name + '</h4></div>';
   contentString += '<p>' + dirLink + '</p>'
   var infowindow = new google.maps.InfoWindow({
       content: contentString,
   });
   

   marker.addListener('click', function () {
        // Close the current InfoWindow if it's open
        if (currentInfowindow) {
            currentInfowindow.close();
        }

       infowindow.open(map, this);

       currentInfowindow = infowindow;
   });

   wineryMarkers.push(marker);
}

function processPlace(place) {
    //console.log(place.place_id);

    let websiteObj = websites.find(obj => obj.place_id === place.place_id);

    if(!websiteObj) {
        //console.log(place.place_id + " not found, fetching");

        fetchPlaceWebsite(place.place_id, function (website) {
            newObj={"place_id":place.place_id,"website":website}
            websites.push(newObj)
            //console.log(newObj)

            var link='';

            if(website =="N/A") {
                link=place.name
            }
            else {
                link="<a href='" + website + "' target='_blank'>" + place.name + "<a/>"
            }

            createTableRow(link,place)
        });
    }
    else {
        //console.log(place.place_id + " was found, no need to fetch");

        var link='';

        if(websiteObj.website =="N/A") {
            link=''
        }
        else {
            link="<a href='" + websiteObj.website + "' target='_blank'>" + place.name + "<a/>"
        }
    
        createTableRow(link,place)
    }
}

function createTableRow(link,place) {
    var checkboxHTML = '<input type="checkbox" name="placeCheckbox" value="' + place.place_id + '">';

    // Create a unique ID for the checkbox (optional)
    var checkboxId = 'checkbox_' + place.place_id.replace(/ /g, '_');

    if (userwineries.includes(place.place_id )) {
        //console.log('Array contains place_id');
        visited="checked"
    } else {
        //console.log('Array does not contain place_id');
        visited=""
    }

    checkboxHTML = `<input type="checkbox" name="placeCheckbox" id="${checkboxId}" value="${place.place_id}" ${visited}>`;

    dataTable.row.add([checkboxHTML, link]).draw();

    // Add the event listener after the row is added
    $(`#${checkboxId}`).on('change', function() {
        // Check if the checkbox is checked or unchecked
        var isChecked = $(this).is(':checked');

        saveWinery(place, isChecked);
    });
}

function saveWinery(place, state) {
    console.log("saveWinery: " + place);

    $.ajax({
        type: 'POST', 
        url: '/saveWinery',
        data: {
            place_id: place.place_id,
            checkbox_state: state,
        },
        success: function(response) {
            console.log('Flask route response:', response);
            
            processUserWineries();
            updatePin(place)
        },
        error: function(error) {
            console.error('Error:', error);
        }
    });
}

function fetchPlaceWebsite(placeId, callback) {
    fetch(`/get-place-website?place_id=${placeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.website) {
                callback(data.website); // Call the callback with the website URL
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
