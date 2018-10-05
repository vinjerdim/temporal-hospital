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


//========================== END INLINE API ================================
app.listen(port);

console.log('todo list RESTful API server started on: ' + port);
