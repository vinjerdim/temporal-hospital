// ========================== Temporal Hospital REST API =======================

const express        = require('express');
const bodyParser     = require('body-parser');
const port           = 8123;
const app            = express();

var connInfo = require('./db_config.js');

const marklogic = require('marklogic');
const db = marklogic.createDatabaseClient(connInfo);

const patients = require("./patient.json");
patients.forEach(patient => {
    var record = {
        'uri' : '/patient/' + patient.patient_id,
        'content' : patient,
        'collections' : ['patient']
    };
    db.documents.write(record).result( 
        function(response) {
            console.log('Loaded the following documents:');
            response.documents.forEach(function(document) {
                console.log(document);
            });
        }, 
        function(error) {
            console.log(JSON.stringify(error, null, 2));
        }
    );
});

const doctors = require("./doctor.json");
doctors.forEach(doctor => {
    var record = {
        'uri' : '/doctor/' + doctor.doctor_id,
        'content' : doctor,
        'collections' : ['doctor']
    };
    db.documents.write(record).result( 
        function(response) {
            console.log('Loaded the following documents:');
            response.documents.forEach(function(document) {
                console.log(document);
            });
        }, 
        function(error) {
            console.log(JSON.stringify(error, null, 2));
        }
    );
});

app.use(bodyParser.json());         // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
})); 

app.get('/', function(request, response) {
    response.send('Temporal Hospital REST API');
});

app.listen(port, () => {
    console.log('Temporal Hospital REST API is running on ' + port);
});