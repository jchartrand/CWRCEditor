var MessageDialog = function(config) {
	var w = config.writer;
	
	$(document.body).append(''+
	'<div id="messageDialog">'+
	    '<p></p>'+
	'</div>');
	
	var message = $('#messageDialog');
	message.dialog({
		modal: true,
		resizable: true,
		closeOnEscape: true,
		height: 250,
		width: 300,
		autoOpen: false
	});
	
	return {
		show: function(config) {
			var title = config.title;
			var msg = config.msg;
			var modal = config.modal == null ? true : config.modal;
			
			message.dialog('option', 'title', title);
			message.dialog('option', 'modal', modal);
			message.dialog('option', 'buttons', {
				'Ok': function() {
					message.dialog('close');
				}
			});
			$('#messageDialog > p').html(msg);
			
			message.dialog('open');
		},
		confirm: function(config) {
			var title = config.title;
			var msg = config.msg;
			var callback = config.callback;
			
			message.dialog('option', 'title', title);
			message.dialog('option', 'buttons', {
				'Yes': function() {
					callback(true);
					message.dialog('close');
				},
				'No': function() {
					callback(false);
					message.dialog('close');
				}
			});
			$('#messageDialog > p').html(msg);
			
			message.dialog('open');
		},
		hide: function() {
			message.dialog('close');
		}
	};
};