// ========================== Temporal Hospital REST API =======================

const express        = require('express');
const bodyParser     = require('body-parser');
const port           = 8123;
const app            = express();
const dateTime = require('node-datetime');
const marklogic = require('marklogic');
var async = require("async");
var connInfo = require('./db_config.js');
var db = marklogic.createDatabaseClient(connInfo);
const qb = marklogic.queryBuilder;
const pb = marklogic.patchBuilder;

var dbInit = require('./load_db.js');
var allen = require('./allen.js');

function isTreatmentEqual(treatmentA, treatmentB) {
	return ((treatmentA.patient_id === treatmentB.patient_id) && 
		(treatmentA.doctor_id === treatmentB.doctor_id) &&
		(treatmentA.room === treatmentB.room) && 
		(treatmentA.disease === treatmentB.disease));
}

function isBefore(t1, t2) {
	return (dateTime.create(t1).getTime() < dateTime.create(t2).getTime());
}

function isAfter(t1, t2) {
	return (dateTime.create(t1).getTime() > dateTime.create(t2).getTime());
}

function isEqual(t1, t2) {
	return (dateTime.create(t1).getTime() == dateTime.create(t2).getTime());
}

function fetchResult() {
	return new Promise(function (resolve, reject) {
	    resolve();
	});
}

function buildUnionDocs(callback) {
	db.documents.query(qb.where(qb.and(qb.collection('treatment_union'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 999)
	).result(
		function(dummyDocs) {
			console.log("Found " + dummyDocs.length + " dummyDocs : \n" + JSON.stringify(dummyDocs, null, 3));
			var unionDocs = new Array();
			dummyDocs.forEach(function(dummyDoc) {
				db.documents.query(
			      	qb.where(qb.and(qb.collection('treatment'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
			    ).result(
				  	function(documents) {
				  		documents.forEach(function(document) {
			  				var resultDoc = dummyDoc;
				  			var treatmentA = dummyDoc.content.treatment;
				  			var treatmentB = document.content.treatment;
				  			if (isTreatmentEqual(treatmentA, treatmentB)) {
				  				var validS1 = dummyDoc.metadataValues.validStart;
				  				var validS2 = document.metadataValues.validStart;
				  				var validE1 = dummyDoc.metadataValues.validEnd;
				  				var validE2 = document.metadataValues.validEnd;

				  				if (isBefore(validS2, validS1)) {
				  					resultDoc.metadataValues.validStart = validS2;
				  				}
				  				if (isAfter(validE2, validE1)) {
				  					resultDoc.metadataValues.validEnd = validE2;
				  				}
				  				unionDocs.push(resultDoc);
				  			} else {
				  				return;
				  			}
				  		})
				  		var i = dummyDocs.indexOf(dummyDoc);
				  		if (i === (dummyDocs.length-1)) {
		  					callback(unionDocs);
				  		}
				  	}
				);
			})
		}
	)
}

app.use(bodyParser.json());         // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
})); 

app.use('/', dbInit);
app.use('/allen', allen);

app.get('/', function(request, response) {
    response.send('Temporal Hospital REST API');
});

app.get("/treatment/all", function(request, response) {
	db.documents.query(
      	qb.where(qb.collection('treatment')).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result(
	  	function(documents) {
	  		console.log("All  " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
			response.status(200).send(JSON.stringify(documents, null, 3));
	  	}
	);
});

app.get("/treatment/latest", function(request, response) {
	db.documents.query(
      	qb.where(qb.and(qb.collection('treatment'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result(
	  	function(documents) {
	  		console.log("All  " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
			response.status(200).send(JSON.stringify(documents, null, 3));
	  	}
	);
});

app.get("/treatment_union/all", function(request, response) {
	db.documents.query(
      	qb.where(qb.and(qb.collection('treatment_union'), qb.collection('latest'))).withOptions({categories: ['content', 'metadata-values']}).slice(1, 99999999)
    ).result(
	  	function(documents) {
	  		console.log("All  " + documents.length + " diff documents : \n" + JSON.stringify(documents, null, 3));
			response.status(200).send(JSON.stringify(documents, null, 3));
	  	}
	);
});

app.post('/treatment/insert', function(request, response) {
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

    var uri = "/" + patientID + "_" + doctorID + "_" + room + "-" + disease;
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
	  function(result) {
		console.log(result);
    	console.log("Inserted object : \n" + JSON.stringify(treatment, null, 3));
		response.status(200).send("OK");
	  }, 
	  function(error) {
	    console.log(JSON.stringify(error, null, 2));
	  }
	);
});

app.post("/treatment/update", function(request, response) {
	console.log('Get new POST request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

	var uri =  request.body.uri;
	var patientID = request.body.patient_id;
    var doctorID = request.body.doctor_id;
    var disease = request.body.disease;
    var room = request.body.room;
    var validStart = request.body.valid_start;
    var validEnd = request.body.valid_end;

    db.documents.read({uris: uri, categories:['content', 'metadata-values']}).result(
    	function(documents) {
    		var treatmentRecord = documents[0];
    		console.log("\nTreatment to update : " + JSON.stringify(treatmentRecord, null, 3));
    		treatmentRecord.temporalCollection = "treatment";
    		treatmentRecord.content.treatment.patient_id = patientID;
    		treatmentRecord.content.treatment.doctor_id = doctorID;
    		treatmentRecord.content.treatment.disease = disease;
    		treatmentRecord.content.treatment.room = room;
    		treatmentRecord.metadataValues.validStart = validStart;
    		treatmentRecord.metadataValues.validEnd = validEnd;
    		db.documents.write(treatmentRecord).result(
				function(result) {
					console.log("Update result : " + JSON.stringify(result, null, 3));
		    		console.log("\nSuccessfully updated document with uri : " + uri);
					response.status(200).send("OK");
			  	}, 
			  	function(error) {
			    	console.log(JSON.stringify(error, null, 2));
			  	}
			);
    	}, 
		function(error) {
			console.log(JSON.stringify(error, null, 2));
		}
    )
});

app.post("/treatment/delete", function(request, response) {
	console.log('Get new POST request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

    var docuri =  request.body.uri;
    console.log("Document uri to delete : " + docuri);
	db.documents.remove({
    	uris: [docuri],
      	temporalCollection: 'treatment'
    }).result(
    	function(result) {
    		console.log("Delete result : " + JSON.stringify(result, null, 3));
    		console.log("\nSuccessfully deleted document with uri : " + docuri);
			response.status(200).send("OK");
    	},
    	function(error) {
	    	console.log(JSON.stringify(error, null, 2));
	  	}
	);
});


app.get("/treatment/select", function(request, response) {
	console.log('Get new GET request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

    var query = request.param('query');
    var queryParams = query.split("=");

    if (queryParams.length != 2) {
    	response.status(200).send("Error! Query should follow the form 'key=value'");
    } else {
    	var queryKey = queryParams[0];
    	var queryValue = queryParams[1];

	    if (queryKey === "patient_id" || queryKey === "doctor_id" || queryKey === "disease" || queryKey === "room") {
	    	db.documents.query(
				qb.where(qb.and(qb.collection('treatment'), qb.value(queryKey, queryValue)/*, qb.collection('latest')*/)).withOptions({categories: ['content', 'collections', 'metadata-values']})
			).result( 
				function(documents) {
		    		console.log("Found " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
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

app.get("/treatment/project", function(request, response) {
	var projectionParams = request.param('projection_keys');
	var projectionKeys = projectionParams.split(",");
	if (projectionKeys.length > 0) {
		projectionKeys.forEach( function(key, index) {
			projectionKeys[index] = "/treatment/" + key;
		});
		console.log("Projected attribute paths : " + JSON.stringify(projectionKeys, null, 1));
		db.documents.query(
	      	qb.where(qb.and(qb.collection('treatment'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999, qb.extract({
		        paths: projectionKeys,
		        selected: 'include-with-ancestors'
		    }))
	    ).result(
		  	function(documents) {
		  		console.log("Projection results length : \n" + documents.length);
		  		console.log("\nProjection results : \n" + JSON.stringify(documents, null, 3));
				response.status(200).send(JSON.stringify(documents, null, 10));
		  	}
		);
	} else {
		console.log("No Given Attribute to Project");
		response.status(200).send("Please specify attribute to project");
	}
});

app.get("/treatment/diff", function(request, response) {
	console.log('Get new GET request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

    var query = request.param('query');
    var queryParams = query.split("=");
    if (queryParams.length != 2) {
    	response.status(200).send("Error! Query should follow the form 'key=value'");
    } else {
    	var queryKey = queryParams[0];
    	var queryValue = queryParams[1];

    	if (queryKey === "patient_id" || queryKey === "doctor_id" || queryKey === "disease" || queryKey === "room") {
	    	db.documents.query(
			  qb.where(qb.and(qb.notIn(qb.collection('treatment'), qb.value(queryKey, queryValue)), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
			).result( 
				function(documents) {
		    		console.log("Found " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
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

app.get("/treatment/union", function(request, response) {
	buildUnionDocs(function(unionDocs) {
		console.log("Union Docs content : \n" + JSON.stringify(unionDocs, null, 2));
		db.documents.query(
			      	qb.where(qb.and(qb.collection('treatment'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
			    ).result(
				  	function(documents) {
				  		var results = documents;
				  		documents.forEach(function(document) {
				  			for (var i=0; i<unionDocs.length; i++) {
				  				var treatmentA = unionDocs[i].content.treatment;
				  				var treatmentB = document.content.treatment;
					  			if (isTreatmentEqual(treatmentA, treatmentB)) {
					  				var j = documents.indexOf(document);
					  				results[j].metadataValues = unionDocs[i].metadataValues;
					  			} else {
					  				continue;
					  			}
				  			}
				  		})
						response.status(200).send(JSON.stringify(results,null,3));
				  	}
				);
	});
});

app.get("/treatment/timeslice", function(request, response) {
	var time = request.param('time');
	db.documents.query(
		qb.where(
	    	qb.periodRange('valid', 'aln_contains', qb.period(time)),
	      	qb.and(qb.collection('treatment'),qb.collection('latest'))
	    ).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result( 
		function(documents) {
    		console.log("Found documents : \n" + JSON.stringify(documents, null, 3));
			response.status(200).send(JSON.stringify(documents, null, 3));
		}, 
		function(error) {
		    console.log(JSON.stringify(error, null, 2));
		}
	);
});

app.listen(port, () => {
    console.log('Temporal Hospital REST API is running on ' + port);
});