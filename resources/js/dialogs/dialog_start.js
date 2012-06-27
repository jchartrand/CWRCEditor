var StartDialog = function(config) {
	$(document.body).append(''+
		'<div id="startDialog"><div class="buttonsParent">'+
			'<button>Load an Existing Document</button>'+
			'<button>Create a Letter</button>'+
			'<button>Create an Event</button>'+
		'</div></div>');
	
	var start = $('#startDialog');
	start.dialog({
		title: 'CWRCWriter Starting Choices',
		modal: true,
		resizable: false,
		closeOnEscape: false,
		position: 'center',
		open: function(event, ui) {
			$('#startDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 205,
		width: 340,
		autoOpen: false
	});
	
	var buttons = $('#startDialog button').button();
	buttons.eq(0).click(function() {
		window.location = 'editor.htm#load';
	});
	buttons.eq(1).click(function() {
		window.location = 'editor.htm#letter';
	});
	buttons.eq(2).click(function() {
		window.location = 'editor.htm#event';
	});
	
	start.dialog('option', 'position', 'center');
	start.dialog('open');
};