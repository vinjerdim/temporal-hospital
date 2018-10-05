var express = require('express'),
  app = express(),
  port = 8123,
  bodyParser = require('body-parser');

const dateTime = require('node-datetime');
const marklogic = require('marklogic');
var connInfo = require('./db_config.js');
var db = marklogic.createDatabaseClient(connInfo);
const qb = marklogic.queryBuilder;
const pb = marklogic.patchBuilder;

var dbInit = require('./load_db.js');
var allen = require('./allen.js');

app.set('view engine', 'pug');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/', dbInit);
app.use('/allen', allen);

var routes = require('./routes/dummyRoutes');
routes(app);

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
function findPatient(patientID, callback) {
    var uri = "/patient/" + patientID;
    db.documents.read(uri)/*.withOptions({categories: ['content', 'collections', 'metadata-values']})*/
    .result(
        function(documents) {
            callback(documents);
        }, 
        function(error) {
            console.log(JSON.stringify(error, null, 2));
        }
    );
}
function patientJoin(callback) {
    db.documents.query(
        qb.where(qb.collection('treatment')).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result(
        function(treatmentDocs) {
            var joinResults = new Array();
            treatmentDocs.forEach(function(treatmentDoc) {
                var patientID = treatmentDoc.content.treatment.patient_id;
                findPatient(patientID, function(documents) {
                    var patient = documents[0].content;
                    treatmentDoc.content.treatment.patient_name = patient.name;
                    treatmentDoc.content.treatment.patient_dob = patient.date_birth;
                    treatmentDoc.content.treatment.gender = patient.gender;
                    joinResults.push(treatmentDoc);
                    var i = treatmentDocs.indexOf(treatmentDoc);
                    if (i === (treatmentDocs.length-1)) {
                        callback(joinResults);
                    }
                });
            })
        }
    );
}

//=============================== INLINE API ================================

app.get("/treatment/latest", function(request, response) {
    db.documents.query(
        qb.where(qb.and(qb.collection('treatment'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result(
        function(documents) {
            console.log("All  " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
            var data = JSON.stringify(documents, null, 3);
            response.render(
               'treatment1',
               { title: 'Latest Treatments', data: data}
            );
        }
    );
});

app.get("/treatment/all", function(request, response) {
    db.documents.query(
        qb.where(qb.collection('treatment')).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result(
                function(documents) {
                        console.log("All  " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
                        var data = JSON.stringify(documents, null, 3);
                        response.render(
                           'treatment2',
                           { title: 'All Treatments', data: data}
                        );
                }
        );
});

app.post("/treatment/insert", function(request, response) {
    var patientID = request.body.patient_id;
    var doctorID = request.body.doctor_id;
    var disease = request.body.disease;
    var room = request.body.room;
    var validStart = request.body.valid_start;
    var validEnd = request.body.valid_end;

    var valid_start = new Date(dateTime.create(validStart).getTime()).toISOString();
    var valid_end = new Date(dateTime.create(validEnd).getTime()).toISOString();

    var uri = "/" + patientID + "_" + doctorID + "_" + room + "_" + disease;
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
        response.status(200).redirect("/treatment/all");
      }, 
      function(error) {
        console.log(JSON.stringify(error, null, 2));
      }
    );
});

app.get("/treatment/update/list", function(request, response) {
    db.documents.query(
        qb.where(qb.and(qb.collection('treatment'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result(
        function(documents) {
            console.log("All  " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
            var data = JSON.stringify(documents, null, 3);
            response.render(
               'update_list',
               { title: 'List of Updatable Treatments', data: data}
            );
        }
    );
});

app.get("/treatment/update/form", function(request, response) {
    var uri = request.param("uri");
    db.documents.read({uris: uri, categories: ['content', 'collections', 'metadata-values']}).result(
        function(documents) {
            var record = documents[0];
            var data = JSON.stringify(record, null, 3);
            console.log("Data : " + data);
            response.render(
               'update_form',
               { title: 'Update a Record', data: data}
            );
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
                    response.status(200).redirect("/treatment/all");
                        //response.status(200).send("OK");
                },
                function(error) {
                    console.log(JSON.stringify(error, null, 2));
                }
            );
        },function(error) {
            console.log(JSON.stringify(error, null, 2));
        }
    )
});

app.get("/treatment/delete", function(request, response) {
    db.documents.query(
        qb.where(qb.and(qb.collection('treatment'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
    ).result(
        function(documents) {
            console.log("All  " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
            var data = JSON.stringify(documents, null, 3);
            response.render(
               'delete',
               { title: 'Delete a Record', data: data}
            );
        }
    );
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
            response.status(200).redirect("/treatment/all");
        },
        function(error) {
            console.log(JSON.stringify(error, null, 2));
        }
    );
});

app.get("/treatment/select/input", function(request, response) {
    console.log('Get new GET request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

    response.status(200).render(
       'selection_input',
       { title: 'Selection Algebra'}
    );
});


app.get("/treatment/select/result", function(request, response) {
    console.log('Get new GET request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

    var query = request.param('query');
    var queryParams = query.split("=");

    if (queryParams.length != 2) {
        response.status(200).render(
           'selection_result',
           { title: "Error! Query should follow the form 'key=value'", data: []}
        );
    } else {
        var queryKey = queryParams[0];
        var queryValue = queryParams[1];

        if (queryKey === "patient_id" || queryKey === "doctor_id" || queryKey === "disease" || queryKey === "room") {
            db.documents.query(
                qb.where(qb.and(qb.collection('treatment'), qb.value(queryKey, queryValue)/*, qb.collection('latest')*/)).withOptions({categories: ['content', 'collections', 'metadata-values']})
            ).result( 
                function(documents) {
                    console.log("Found " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
                    var data = JSON.stringify(documents, null, 3);
                    response.status(200).render(
                       'selection_result',
                       { title: 'Selection Result', data: data}
                    );
                }, 
                function(error) {
                    console.log(JSON.stringify(error, null, 2));
                }
            );
        } else {
            response.status(200).render(
               'selection_result',
               { title: "Error! Unknown query parameter", data: []}
            );
        }
    }
});

app.get("/treatment/diff/input", function(request, response) {
    console.log('Get new GET request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

    response.status(200).render(
       'diff_input',
       { title: 'Difference Algebra'}
    );
});

app.get("/treatment/diff/result", function(request, response) {
    console.log('Get new GET request from ' + request.originalUrl);
    console.log('\t' + JSON.stringify(request.body));

    var query = request.param('query');
    var queryParams = query.split("=");
    if (queryParams.length != 2) {
        response.status(200).render(
           'diff_result',
           { title: "Error! Query should follow the form 'key=value'", data: []}
        );
    } else {
        var queryKey = queryParams[0];
        var queryValue = queryParams[1];

        if (queryKey === "patient_id" || queryKey === "doctor_id" || queryKey === "disease" || queryKey === "room") {
            db.documents.query(
              qb.where(qb.and(qb.notIn(qb.collection('treatment'), qb.value(queryKey, queryValue)), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
            ).result( 
                function(documents) {
                    console.log("Found " + documents.length + " documents : \n" + JSON.stringify(documents, null, 3));
                    var data = JSON.stringify(documents, null, 3);
                    response.status(200).render(
                       'diff_result',
                       { title: 'Difference Result', data: data}
                    );
                }, 
                function(error) {
                    console.log(JSON.stringify(error, null, 2));
                }
            );
        } else {
            response.status(200).render(
               'diff_result',
               { title: "Error! Unknown query parameter", data: []}
            );
        }
    }
});

app.get("/treatment/union/input", function(request, response) {
    db.documents.query(qb.where(qb.and(qb.collection('treatment_union'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 999)
    ).result(
        function(dummyDocs) {
            db.documents.query(
                qb.where(qb.and(qb.collection('treatment'), qb.collection('latest'))).withOptions({categories: ['content', 'collections', 'metadata-values']}).slice(1, 99999999)
            ).result(
                function(documents) {
                    var obj = new Object();
                    obj.documents = documents;
                    obj.dummy_docs = dummyDocs;
                    var data = JSON.stringify(obj, null, 2);
                    response.status(200).render(
                       'union_input',
                       { title: "Union Operation", data: data}
                    );
                }
            );
        }
    )
});

app.get("/treatment/union/result", function(request, response) {
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
                        var data = JSON.stringify(documents, null, 3);
                        response.status(200).render(
                           'union_result',
                           { title: 'Union Result', data: data}
                        );
                    }
                );
    });
});


//========================== END INLINE API ================================
app.listen(port);

console.log('todo list RESTful API server started on: ' + port);
