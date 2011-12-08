var MessageDialog = function(config) {
	var w = config.writer;
	
	$(document.body).append(''+
	'<div id="messageDialog">'+
	    '<p></p>'+
	'</div>');
	
	var message = $('#messageDialog');
	message.dialog({
		modal: true,
		resizable: false,
		closeOnEscape: true,
		height: 250,
		width: 300,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				message.dialog('close');
			}
		}
	});
	
	return {
		show: function(config) {
			var title = config.title;
			var msg = config.msg;
			
			message.dialog('option', 'title', title);
			$('#messageDialog > p').html(msg);
			
			message.dialog('open');
		},
		hide: function() {
			message.dialog('close');
		}
	};
};