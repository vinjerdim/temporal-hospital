$(document).ready(function(){

$('select').change(function(){
   if($(this).val() == 'Selection' || $(this).val() == 'Projection')
     $('.relation-2').fadeOut('slow');
   else
     $('.relation-2').fadeIn('slow');
});

});
