'use strict';
module.exports = function(app) {
  var dummy = require('../controllers/dummyController');

  app.route('/')
    .get(function(req,res){
      res.redirect('/treatment/latest');
    })

  app.route('/patient')
    .get(dummy.show_patient)

  app.route('/specialization')
    .get(dummy.show_specialization)

  app.route('/treatment1')
    .get(dummy.show_treatment1)

  app.route('/treatment2')
    .get(dummy.show_treatment2)

  app.route('/algebra')
    .get(dummy.form_algebra)

  app.route('/allen')
    .get(dummy.form_allen)

  app.route('/insert')
    .get(dummy.form_insert)

  app.route('/update')
    .get(dummy.form_update)

  app.route('/delete')
    .get(dummy.form_delete)
};
