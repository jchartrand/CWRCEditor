var Validation = function(config) {
	
	var w = config.writer;
	
	var id = config.parentId;
	
	var validation = {};
	
	/**
	 * Processes a validation response from the server.
	 * @param errorDoc The actual response
	 * @param docString The doc string sent to the server for validation  
	 */
	validation.showErrors = function(errorDoc, docString) {
		var container = $(id);
		container.empty().append('<ul class="validationList"></ul>');
		var list = container.find('ul');
		
		docString = docString.split('\n')[1]; // remove the xml header
		
		$('error', errorDoc).each(function(index, el) {
			var id = '';
			var message = $(this).find('message').text();
			
			var column = parseInt($(this).find('column').text());
			if (!isNaN(column)) {
				var docSubstring = docString.substring(0, column);
				var tags = docSubstring.match(/<.*?>/g);
				var tag = tags[tags.length-1];
				id = tag.match(/id="(.*?)"/i)[1];
			}
			
			var item = list.append('<li>'+message+'</li>').find('li:last');
			item.data('id', id);
		});
		
		list.find('li').click(function() {
			var id = $(this).data('id');
			w.selectStructureTag(id);
		});
		
		w.layout.center.children.layout1.show('south');
	};
	
	return validation;
};