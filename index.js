// ========================== Temporal Hospital REST API =======================

const express        = require('express');
const bodyParser     = require('body-parser');
const port           = 8123;
const app            = express();
const dateTime = require('node-datetime');
const marklogic = require('marklogic');
const markLogiConn = require('./markLogicConn');
const db = marklogic.createDatabaseClient(markLogiConn.connInfo);
const qb = marklogic.queryBuilder;
const pb = marklogic.patchBuilder;

app.use(bodyParser.json());         // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
})); 

app.get('/', function(request, response) {
    response.send('Temporal Hospital REST API');
});

app.get('/test1', function(request, response) {
	const documents = [
	  { uri: '/gs/aardvark.json',
	    content: {
	      name: 'aardvark',
	      kind: 'mammal',
	      desc: 'The aardvark is a medium-sized burrowing, nocturnal mammal.'
	    }
	  },
	  { uri: '/gs/bluebird.json',
	    content: {
	      name: 'bluebird',
	      kind: 'bird',
	      desc: 'The bluebird is a medium-sized, mostly insectivorous bird.'
	    }
	  },
	  { uri: '/gs/cobra.json',
	    content: {
	      name: 'cobra',
	      kind: 'mammal',
	      desc: 'The cobra is a venomous, hooded snake of the family Elapidae.'
	    }
	  },
	];
	db.documents.write(documents).result( 
	  function(response) {
	    console.log('Loaded the following documents:');
	    response.documents.forEach( function(document) {
	      console.log('  ' + document.uri);
	    });
	  }, 
	  function(error) {
	    console.log(JSON.stringify(error, null, 2));
	  }
	);
});

app.get('/test2', function(request, response) {
	db.documents.query(
	  qb.where(qb.byExample({kind: 'mammal'}))
	).result( 
		function(documents) {
		    console.log('Matches for kind=mammal:')
		    documents.forEach( function(document) {
		      console.log('\nURI: ' + document.uri);
		      console.log('Name: ' + document.content.name);
		    });
		}, 
		function(error) {
		    console.log(JSON.stringify(error, null, 2));
		}
	);
});

app.get('/test3', function(request, response) {
	db.documents.patch(
	  '/gs/cobra.json',
	  pb.replace('/kind', 'reptile')
	).result( function(response) {
	    console.log('Patched ' + response.uri);
	}, function(error) {
	    console.log(JSON.stringify(error, null, 2));
	});
});

app.get('/test4', function(request, response) {
	db.documents.read(
	  '/gs/cobra.json'
	).result( function(documents) {
	  documents.forEach( function(document) {
	    console.log(JSON.stringify(document, null, 2) + '\n');
	  });
	}, function(error) {
	    console.log(JSON.stringify(error, null, 2));
	});
});

app.get('/test5', function(request, response) {
	db.documents.removeAll(
	  {directory: '/gs/'}
	).result( function(response) {
	  console.log(response);
	});
});

app.get('/test6', function(request, response) {
	db.documents.read(
	  '/animals.json'
	).result( function(documents) {
	  documents.forEach( function(document) {
	    console.log(JSON.stringify(document, null, 2) + '\n');
	  });
	}, function(error) {
	    console.log(JSON.stringify(error, null, 2));
	});
});

app.get('/test7', function(request, response) {
	var trade = { 
		uri: '/trading_1.json',
		temporalCollection: 'trading',
		content: {
      		"trade": {
      			"trader": "John",
    			"price": 12
    		}
		},
		metadataValues: {
			validStart: "2018-10-03T11:00:00",
	        validEnd: "2018-10-07T11:00:00"
	    }
      	// validStart: "2018-10-03T11:00:00",
      	// validEnd: "2018-10-07T11:00:00"
    };
	//db.documents.write(trade, null, null, null, null, "trading").result(
	var dt = dateTime.create();
	//db.documents.write(trade, [], "", "", "", "trading", dt._now).result(
	db.documents.write(trade).result(  
	  function(writeResp) {
		console.log(writeResp);
		response.status(200).send("OK");
	  }, 
	  function(error) {
	    console.log(JSON.stringify(error, null, 2));
	  }
	);
});

app.post('/insert', function(request, response) {
	console.log('Get new POST request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

    var patientID = request.body.patient_id;
    var doctorID = request.body.doctor_id;
    var disease = request.body.disease;
    var room = request.body.room;
    var validStart = request.body.valid_start;
    var validEnd = request.body.valid_end;

    var valid_start = new Date(dateTime.create(validStart).getTime()).toISOString();
    var valid_end = new Date(dateTime.create(validEnd).getTime()).toISOString();

    var uri = "/" + patientID + "_" + doctorID + "_" + valid_start + "-" + valid_end + ".json";
    var treatment = { 
		uri: uri,
		temporalCollection: 'treatment',
		content: {
			"treatment" : {
	      		"patient_id": patientID,
	      		"doctor_id": doctorID,
	      		"room": room,
	      		"disease": disease
			}
		},
		metadataValues: {
			validStart: valid_start,
	        validEnd: valid_end
	    }
    };
    db.documents.write(treatment).result(  
	  function(writeResp) {
		console.log(writeResp);
    	console.log("Saved object : \n" + JSON.stringify(treatment, null, 3));
		response.status(200).send("OK");
	  }, 
	  function(error) {
	    console.log(JSON.stringify(error, null, 2));
	  }
	);
    //response.status(200).send(JSON.stringify(treatment));
});

app.get("/all", function(request, response) {
	db.documents.query(
      	qb.where(qb.collection('treatment')).withOptions({categories: ['content', 'metadata-values']})
    ).result(
	  	function(documents) {
	  		console.log("All documents : \n" + JSON.stringify(documents, null, 3));
			response.status(200).send(JSON.stringify(documents, null, 3));
	  	}
	);
});

app.get("/select", function(request, response) {
	console.log('Get new GET request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

    var query = request.param('query');
    var queryParams = query.split("=");
    if (queryParams.length != 2) {
    	response.status(200).send("Error! Query should follow the form 'key=value'");
    } else {
    	var queryKey = queryParams[0];
	    if (queryKey === "disease") {
		    var diseaseName = queryParams[1];

		    db.documents.query(
			  qb.where(qb.byExample({disease: diseaseName})).withOptions({categories: ['content', 'metadata-values']})
			).result( 
				function(documents) {
		    		console.log("Found documents : \n" + JSON.stringify(documents, null, 3));
					response.status(200).send(JSON.stringify(documents, null, 3));
				}, 
				function(error) {
				    console.log(JSON.stringify(error, null, 2));
				}
			);
			// db.documents.query(qb.where(
			//   	qb.parsedFrom('disease:'+diseaseName, qb.parseBindings(
			//     	qb.value('disease', qb.bind('disease'))
			//   	))
			// ).withOptions({categories: ['content', 'metadata-values']})).result( 
			// 	function(documents) {
		 //    		console.log("Found documents : \n" + JSON.stringify(documents, null, 3));
			// 		response.status(200).send(JSON.stringify(documents, null, 3));
			// 	}, 
			// 	function(error) {
			// 	    console.log(JSON.stringify(error, null, 2));
			// 	}
			// );
	    } else if (queryKey === "room") {
	    	var roomName = queryParams[1];

		    db.documents.query(
			  qb.where(qb.byExample({room: roomName})).withOptions({categories: ['content', 'metadata-values']})
			).result( 
				function(documents) {
				    // console.log('Matches for kind=mammal:')
				    // documents.forEach( function(document) {
				    //   console.log('\nURI: ' + document.uri);
				    //   console.log('Name: ' + document.content.name);
				    // });
		    		console.log("Found documents : \n" + JSON.stringify(documents, null, 3));
					response.status(200).send(JSON.stringify(documents, null, 3));
				}, 
				function(error) {
				    console.log(JSON.stringify(error, null, 2));
				}
			);
	    } else {
	    	response.status(200).send("Error! Unknown query parameter");
	    }
    }
});

app.get("/project", function(request, response) {
	var projectionParams = request.param('projection_keys');
	var projectionKeys = projectionParams.split(",");
	if (projectionKeys.length > 0) {
		projectionKeys.forEach( function(key, index) {
			projectionKeys[index] = "/treatment/" + key;
		});
		console.log("Projected attribute paths : " + JSON.stringify(projectionKeys, null, 1));
		//response.status(200).send(JSON.stringify(projectionKeys, null, 3));
		db.documents.query(
	      	qb.where(qb.collection('treatment')).withOptions({categories: ['content', 'metadata-values']}).slice(qb.extract({
		        paths: projectionKeys,
		        selected: 'include-with-ancestors'
		    }))
	    ).result(
		  	function(documents) {
		  		console.log("Projection results : \n" + JSON.stringify(documents, null, 3));
				response.status(200).send(JSON.stringify(documents, null, 3));
		  	}
		);
	} else {
		console.log("No Given Attrbute to Project");
		response.status(200).send("Please specify attribute to project");
	}
});

app.listen(port, () => {
    console.log('Temporal Hospital REST API is running on ' + port);
});