$(document).ready(function(){

$('select').change(function(){
   if($(this).val() == 'Selection' || $(this).val() == 'Projection')
     $('.relation-2').fadeOut('slow');
   else
     $('.relation-2').fadeIn('slow');
});

$( "input.submit-allen" ).click(function( event ) {
    event.preventDefault();
	var query =  $('select.selectpicker').val();
	var start = $('input[name="start"]').val();
	var end = $('input[name="end"]').val();

	$('form.allen').attr('action', '/allen/' + query + '/' + start + '/' + end);

	$('form.allen').submit();
    
});

});
