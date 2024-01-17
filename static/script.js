var map;
var wineryService;
var wineryMarkers = [];
var defaultLocation; // Will be set to the user's location
let userwineries;

function getUserWineries() {
    fetch('/getUserWineries', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Handle the wineries array returned from the Flask route
        userwineries = data.wineries;
        console.log('User Wineries:', userwineries);

        // You can process the wineries array here, e.g., display them in your application
    })
    .catch(error => {
        console.error('Error:', error);
    });
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


   getUserWineries();
   
   wineryService = new google.maps.places.PlacesService(map);

   

   dataTable = $('#wineryTable').DataTable({ // Initialize DataTables
        "paging": true, // Enable paging
        "searching": true, // Enable searching
        "ordering": true, // Enable sorting
        "info": true, // Show table information
        columnDefs: [
            { targets: [0], width: '10%' }, 
            { targets: [1], width: '30%' }, 
            { targets: [2], width: '30%' }, 
            { targets: [3], width: '30%' }, 
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
           searchForWineries(defaultLocation); // Perform initial search
       }, function () {
            console.log("geolocation failed");
           // Handle errors if geolocation fails
           defaultLocation = { lat: 37.7749, lng: -122.4194 }; // Default location (San Francisco)
           map.setCenter(defaultLocation); // Set the map center to the default location
           searchForWineries(defaultLocation); // Perform initial search
       });
   } else {
        console.log("geolocation not available");
       // Geolocation is not available, use the default location
       defaultLocation = { lat: 37.7749, lng: -122.4194 }; // Default location (San Francisco)
       map.setCenter(defaultLocation); // Set the map center to the default location
       searchForWineries(defaultLocation); // Perform initial search
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

        if (zoomLevel < 10) {
            
        } else {
            // Example: If zoom level is greater than or equal to 10, do something else
        }
    });
}

    


function logCoordinates() {
   var center = map.getCenter();
   console.log('Map Center Coordinates: Lat ' + center.lat() + ', Lng ' + center.lng());
}

function searchForWineries() {
    dataTable.clear().draw();

   // Clear existing winery markers
   wineryMarkers.forEach(function (marker) {
       marker.setMap(null);
   });
   wineryMarkers = [];

   // Define search parameters
   var request = {
       bounds: map.getBounds(),
       keyword: 'winery',
   };

   // Perform a Places API search
   wineryService.nearbySearch(request, function (results, status) {
       if (status === google.maps.places.PlacesServiceStatus.OK) {
            console.log(results);
           results.forEach(function (place) {
               createWineryMarker(place);
               processPlace(place);
           });
       }
       else {
        crossOriginIsolated.log("!!!!!")
       }
   });
}

function createWineryMarker(place) {
   var marker = new google.maps.Marker({
       map: map,
       position: place.geometry.location,
       title: place.name,
   });

   // Create info window for each marker
   var contentString = '<div><h4>' + place.name + '</h4><p>' + place.vicinity + '</p></div>';
   var infowindow = new google.maps.InfoWindow({
       content: contentString,
   });

   marker.addListener('click', function () {
       infowindow.open(map, marker);
   });

   wineryMarkers.push(marker);
}

function processPlace(place) {
    placeID = place.place_id;

    fetchPlaceWebsite(placeID, function (website) {
        var link='';

        if(website=="N/A") {
            link=''
        }
        else {
            link="<a href='" + website + "' target='_blank'>" + website + "<a/>"
        }

        createTableRow(link,place)
    });
}

function createTableRow(link,place) {
    lat=place.geometry.location.lat()
    lng=place.geometry.location.lng()

    vicinity=place.vicinity
    //console.log(vicinity)

    dirURL=`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    dirLink=`<a href='${dirURL}' target='_blank'>${vicinity}`;

    //console.log(dirLink)

    var checkboxHTML = '<input type="checkbox" name="placeCheckbox" value="' + place.place_id + '">';

    // Create a unique ID for the checkbox (optional)
    var checkboxId = 'checkbox_' + place.place_id.replace(/ /g, '_');

    if (userwineries.includes(place.place_id )) {
        console.log('Array contains place_id');
        visited="checked"
    } else {
        console.log('Array does not contain place_id');
        visited=""
    }

    checkboxHTML = `<input type="checkbox" name="placeCheckbox" id="${checkboxId}" value="${place.place_id}" ${visited}>`;

    dataTable.row.add([checkboxHTML, place.name, link, dirLink]).draw();

    // Add the event listener after the row is added
    $(`#${checkboxId}`).on('change', function() {
        // Check if the checkbox is checked or unchecked
        var isChecked = $(this).is(':checked');

        saveWinery(place.place_id, isChecked);
    });
}

function saveWinery(place_id, state) {
    console.log("::" + place_id);
    $.ajax({
        type: 'POST', // or 'GET' depending on your route
        url: '/saveWinery', // Replace with your Flask route URL
        data: {
            place_id: place_id,
            checkbox_state: state,
        },
        success: function(response) {
            // Handle the Flask route response here
            console.log('Flask route response:', response);
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
