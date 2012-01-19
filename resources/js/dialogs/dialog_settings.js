var SettingsDialog = function(config) {
	var w = config.writer;
	
	var settings = {
		fontSize: '11pt',
		fontFamily: 'Book Antiqua',
		showBrackets: true,
		showSchemaBrackets: false
	};
	
	$('#header').append(''+
		'<div id="settingsLink"><h2>Settings</h2></div>');
	
	$(document.body).append(''+
	'<div id="settingsDialog">'+
	'<div>'+
	'<label>Font Size</label><select name="fontsize">'+
	'<option value="9pt">9pt</option>'+
	'<option value="10pt">10pt</option>'+
	'<option value="11pt">11pt</option>'+
	'<option value="12pt">12pt</option>'+
	'<option value="13pt">13pt</option>'+
	'</select>'+
	'</div>'+
	'<div style="margin-top: 10px;">'+
	'<label>Font Type</label><select name="fonttype">'+
	'<option value="Arial" style="font-family: Arial; font-size: 12px;">Arial</option>'+
	'<option value="Book Antiqua" style="font-family: Book Antiqua; font-size: 12px;">Book Antiqua</option>'+
	'<option value="Georgia" style="font-family: Georgia; font-size: 12px;">Georgia</option>'+
	'<option value="Helvetica" style="font-family: Helvetica; font-size: 12px;">Helvetica</option>'+
	'<option value="Palatino" style="font-family: Palatino; font-size: 12px;">Palatino</option>'+
	'<option value="Tahoma" style="font-family: Tahoma; font-size: 12px;">Tahoma</option>'+
	'<option value="Times New Roman" style="font-family: Times New Roman; font-size: 12px;">Times New Roman</option>'+
	'<option value="Verdana" style="font-family: Verdana; font-size: 12px;">Verdana</option>'+
	'</select>'+
	'</div>'+
	'<div style="margin-top: 10px;">'+
	'<label for="showbrackets">Show Entity Brackets</label>'+
	'<input type="checkbox" id="showbrackets" />'+
	'</div>'+
	'<div style="margin-top: 10px;">'+
	'<label for="showschemabrackets">Show Tag Brackets</label>'+
	'<input type="checkbox" id="showschemabrackets" />'+
	'</div>'+
	'<div style="margin-top: 10px;">'+
	'<label>Editor Mode</label><select name="editormode">'+
	'<option value="0">XML & RDF (overlapping entities)</option>'+
	'<option value="1">XML (no overlap)</option>'+
	'</select>'+
	'</div>'+
	'</div>');
	
	$('#settingsLink').click(function() {
		$('select[name="fontsize"] > option[value="'+settings.fontSize+'"]', $('#settingsDialog')).attr('selected', true);
		$('select[name="fonttype"] > option[value="'+settings.fontFamily+'"]', $('#settingsDialog')).attr('selected', true);
		$('#showbrackets').prop('checked', settings.showBrackets);
		$('#showschemabrackets').prop('checked', settings.showSchemaBrackets);
		$('select[name="editormode"] > option[value="'+w.mode+'"]', $('#settingsDialog')).attr('selected', true);
		$('#settingsDialog').dialog('open');
	});
	
	$('#settingsDialog').dialog({
		title: 'Settings',
		modal: true,
		resizable: false,
		closeOnEscape: true,
		height: 250,
		width: 325,
		autoOpen: false,
		buttons: {
			'Ok': function() {
				applySettings();
				$('#settingsDialog').dialog('close');
			},
			'Cancel': function() {
				$('#settingsDialog').dialog('close');
			}
		}
	});
	
	var applySettings = function() {
		var editorMode = parseInt($('select[name="editormode"]', $('#settingsDialog')).val());
		if (editorMode != w.mode) {
			var doModeChange = true;
			if (w.mode == w.XMLRDF && editorMode == w.XML) {
				var overlaps = _doEntitiesOverlap();
				if (overlaps) {
					doModeChange = false;
					w.d.show('message', {
						title: 'Error',
						msg: 'You have overlapping entities and are trying to change to XML mode (which doesn\'t permit overlaps).  Please remove the overlapping entities and try again.'
					});
				}
			}
			if (doModeChange) {
				w.mode = editorMode;
			}
		}
		
		settings.fontSize = $('select[name="fontsize"]', $('#settingsDialog')).val();
		settings.fontFamily = $('select[name="fonttype"]', $('#settingsDialog')).val();
		
		if (settings.showBrackets != $('#showbrackets').prop('checked')) {
			w.editor.$('entity').toggleClass('noBorder');
		}
		settings.showBrackets = $('#showbrackets').prop('checked');
		
		if (settings.showSchemaBrackets != $('#showschemabrackets').prop('checked')) {
			w.editor.$('body').toggleClass('showSchemaBrackets');
		}
		settings.showSchemaBrackets = $('#showschemabrackets').prop('checked');
		
		var styles = {
			fontSize: settings.fontSize,
			fontFamily: settings.fontFamily
		};
		w.editor.dom.setStyles(w.editor.dom.getRoot(), styles);
	};
	
	var _doEntitiesOverlap = function() {
		// remove highlights
		w.highlightEntity();
		
		for (var id in w.entities) {
			var markers = w.editor.dom.select('entity[name="'+id+'"]');
			var start = markers[0];
			var end = markers[1];
			var currentNode = start;
			while (currentNode != end  && currentNode != null) {
				currentNode = currentNode.nextSibling;
				if (currentNode.nodeName.toLowerCase() == 'entity' && currentNode != end) {
					return true;
				}
			}
		}
		return false;
	};
	
	return {
		getSettings: function() {
			return this.settings;
		}
	};
};