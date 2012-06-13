var StartDialog = function(config) {
	$(document.body).append(''+
		'<div id="startDialog"><div class="buttonsParent">'+
			'<button>Load an Existing Document</button>'+
			'<button>Start a CWRC-TEI Document</button>'+
			'<button>Start a CWRC-EVENTS Document</button>'+
			'<button>Create a Letter with CWRC-TEI</button>'+
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
		height: 255,
		width: 340,
		autoOpen: false
	});
	
	var buttons = $('#startDialog button').button();
	buttons.eq(0).click(function() {
		window.location = 'editor.htm#load';
	});
	buttons.eq(1).click(function() {
		window.location = 'editor.htm#tei';
	});
	buttons.eq(2).click(function() {
		window.location = 'editor.htm#events';
	});
	buttons.eq(3).click(function() {
		window.location = 'editor.htm#letter';
	});
	
	start.dialog('option', 'position', 'center');
	start.dialog('open');
};