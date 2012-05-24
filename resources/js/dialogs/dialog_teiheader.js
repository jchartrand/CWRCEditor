var TeiHeaderDialog = function(config) {
	var w = config.writer;
	
	$('#header').append(''+
	'<div id="headerLink"><h2>Edit Header</h2></div>');
	
	$(document.body).append(''+
	'<div id="teiHeaderDialog">'+
	'<h1>File Description</h1>'+
	'<h2>Title Statement</h2>'+
	'<div><label for="tei_title">Title</label><input type="text" id="tei_title" name="title"/></div>'+
	'<div><label for="tei_author">Author</label><input type="text" id="tei_author" name="author"/></div>'+
	'<h3>Responsiblity Statement</h3>'+
	'<div><label for="tei_resp">Responsibility</label><input type="text" id="tei_resp" name="resp"/></div>'+
	'<div><label for="tei_name">Name</label><input type="text" id="tei_name" name="name"/></div>'+
	'<h2>Publication Statement</h2>'+
	'<div><label for="tei_distributor">Distributor</label><input type="text" id="tei_distributor" name="distributor"/></div>'+
	'<div><label for="tei_address">Address</label><input type="text" id="tei_address" name="address"/></div>'+
	'<div><label for="tei_idno">Identifier</label><input type="text" id="tei_idno" name="idno"/></div>'+
	'<div><label for="tei_date">Date</label><input type="text" id="tei_date" name="date"/></div>'+
	'<h2>Source Description</h2>'+
	'<div><label for="tei_bibl">Bibliographic Citation</label><input type="text" id="tei_bibl" name="bibl"/></div>'+
	'<p style="font-weight: bold;">NB: For demo purposes only. Saving not yet supported.</p>'+
	'</div>');
	
	var teiHeader = $('#teiHeaderDialog');
	teiHeader.dialog({
		title: 'Edit Header',
		modal: true,
		resizable: false,
		closeOnEscape: false,
		open: function(event, ui) {
			$('#teiHeaderDialog').parent().find('.ui-dialog-titlebar-close').hide();
		},
		height: 520,
		width: 400,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				teiHeader.dialog('close');
			},
			'Cancel': function() {
				teiHeader.dialog('close');
			}
		}
	});
	
	$('#headerLink').click(function() {
		teiHeader.dialog('open');
	});
	
	return {
		show: function(config) {
			teiHeader.dialog('open');
		},
		hide: function() {
			teiHeader.dialog('close');
		}
	};
};