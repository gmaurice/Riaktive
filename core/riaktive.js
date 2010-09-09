(function($) {
	$.riaktive = $.riaktive || {};

	$.riaktive.show_notification = function(notification_text) {
			$.gritter.add({ title: 'Riaktive says: ', text: notification_text});
			return; // I don't know why this needed :D
	}

	$.extend($.riaktive, {

		/*PROPERTY*/
		IndexPage: function() {
			var riak_client = new RiakClient();
			
			// Some kind of cache to increase speed
			var most_used = {};

			// Bucket for Riaktive needs
			var riaktive_bucket = new RiakBucket('8protons.com_riaktive', riak_client);
			
			var buckets_list = {};

			/*FUNCTION*/ 
			this.init = function() {
				most_used.riaktive_table_content = $('#riaktive-table tbody.content');
			
				$('#content #riaktive-table tbody.content td.actions button.delete').live('click', this.delete_bucket_from_list);

				// Get the list of buckets
				riaktive_bucket.get_or_new('allbuckets', function(status, object) {
					if (status == 'ok') { // a
						buckets_list = object;
						buckets_list.contentType = 'application/json';
						// If body of RiakObject not null or something
						if (buckets_list.body) { // b
							// Strange, but some browsers save value like json and some - like string
							if (!(buckets_list.body instanceof Array)) { // c
								// Try to parse
								try {
									buckets_list.body = JSON.parse(buckets_list.body);
								}
								catch (e) {
									// If something wrong - just assign default value
									buckets_list.body = [];
								}
							} //End of 'c' block
						} // End of 'b' block
						else { 
							buckets_list.body = [];
						}
						
						// If everything allright	
						construct_buckets_table();
						
					} // End of 'a' block					
				}); // End of riaktive_bucket.get_or_new

			} // End of 'init' function
			
			/*FUNCTION*/
			this.add_bucket = function() {
				var bname = $('#add-bucket-input').val();
				if (bname !== "") { // a
					if (buckets_list.body.indexOf(bname) < 0) { // b

						// Add bucket-name to array
						buckets_list.body.push(bname);

						// Save bucket collection
						buckets_list.store(function(status, object, request) {
							if (status === 'ok') {
								// Append new row to table
								most_used.riaktive_table_content.append(get_row(bname));
								get_number_of_documents(bname);
								$.riaktive.show_notification('The Bucket "' + bname + '" has been successfuly added to the list in short memory');
							}
						}); // End of buckets_list.store
					} // End of 'b' block
					else {
						//If value is already exist then show the notification
						$.riaktive.show_notification('Bucket "' + bname + '" is already exist in my short memory');
					} // End of 'b' else block
				} 
				else {
					//If value is empty then show the notification
					$.riaktive.show_notification('Bucket Name can not be empty');
				} // End of 'a' block

			} // End of 'add_bucket' function
			
			/*FUNCTION*/
			this.delete_bucket_from_list = function() {
				// Delete bucket from array
				buckets_list.body.splice(buckets_list.body.indexOf($(this).val()), 1);
				
				// Remove table element
				$('#riaktive-table tbody.content tr[id="'+ $(this).val() + '"]').remove();
			
				// Save changes
				buckets_list.store(function(status, object, request) {
					if (status === 'ok') {
						$.riaktive.show_notification('The Bucket "' + $(this).val() + '" has been successfuly removed from the list in short memory');
					}
					else {
						$.riaktive.show_notification('Something goes wrong. Try reload the page and check the RIAK connection');
					}
				});
			} // End of 'delete_bucket_from_list' function

			/*HELP FUNCTIONS*/
			function construct_buckets_table() {
				if (buckets_list.body) {
					// Clear table
					most_used.riaktive_table_content.empty();

					var html = '';
					var bname = '';
					// Fill table of buckets
					for (var elem in buckets_list.body) {
						bname = buckets_list.body[elem];
						html = get_row(bname);
						
						// Add element to table
						most_used.riaktive_table_content.append(html);
	
						get_number_of_documents(bname);
					} // End of FOR iterator
				}
			} // End of 'reconstruct_buckets_table' function

			function get_row(bucket_id) {
				return '<tr id="' + bucket_id + '"><th><a href="bucket.html?bucket_name=' + bucket_id + '">' + bucket_id + '</a></th>' + '<td class="size">&nbsp;</td><td class="actions"><button class="delete" value="'+ bucket_id + '">Remove from list</button></td></tr>';
			} // End of 'get_row' function

			function get_number_of_documents(bucket_name) {
				// Get information about number of document in bucket
				$.getJSON('/riak/' + bucket_name + '?keys=true', function(document, status) { 
					if (status == 'success') {

						$('#riaktive-table tbody.content tr[id="'+ document.props.name + '"] td.size').html(document.keys.length);
					}
				}); // End of getJSON
			} // End of 'get_number_of_documents' function

		}, // End of IndexPage property

		/*PROPERTY*/
		BucketPage: function() {
			// Riak Client =)
			var riak_client = new RiakClient();

			var bucket_name = "";
			// Yeah, this is the current bucket variable :D Raw object (from request via REST)
			var current_bucket = {};
			
			// Default values
			var showcount = 10;
			var page = 1;
			var totalpages = 1;

			// HTML FileReader Object
			var reader = {};

			// Some kind of cache to increase speed
			var most_used = {};
			var current_bucket_length = 0; // Reduce recount of bucket elements

			var temp_document = {};

			/*FUNCTION*/ 
			this.init = function() {
				fill_most_used(most_used);

				// Set Live function for delete document function
				$('#content #riaktive-table tbody.content td.actions button.delete').live('click', this.delete_document);
				$('#bucket-prop-table-div #prop-table td.actions button.ok').live('click', this.change_property);
				// Get the bucket name
				bucket_name = getQuerystring('bucket_name', "");

				if (bucket_name) { // a
					// Add link to the header
					$("#header .wrapper").append('<a class="path" href="' + document.URL + '">' + bucket_name + '</a>');

					$.getJSON('/riak/' + bucket_name + '?keys=true', function(data, status) {
						if (status == 'success') { // b
							current_bucket = data;
							current_bucket_length = current_bucket.keys.length;
							
							// Update the Bucket Title
							$("#bucket_name_title").html('Bucket Name: ' + bucket_name);

							// Update information about total pages and other
							calculate_pages();

							// Reconstruct keys table with new data
							reconstruct_keys_table();
						
							fill_props_table();

						} // End of 'b' block
						else {
							// Simple redirection
							window.location = "/riak/8protons.com_riaktive/index.html";
						}
					}); // End of getJSON
				}  // End of 'a' block
				else {
					// Simple redirection
					window.location = "/riak/8protons.com_riaktive/index.html";
				}				

			}; // End of 'init' function
			
			/*FUNCTION*/
			this.per_page = function() {
				
				// Parse int from select to retrieve Show Count
				showcount = parseInt($(this).val()) ? parseInt($(this).val()) : 10;

				// Update table and info
				calculate_pages();
				reconstruct_keys_table();
			} // End of 'per_page' function

			/*FUNCTION*/
			this.next_page = function() {
				if (page < totalpages) {
					page += 1;
					// Update table and info
					calculate_pages();
					reconstruct_keys_table();
				}
			} // End of 'next_page' function

			/*FUNCTION*/
			this.prev_page = function() {
				if (page > 1) {
					page -= 1;
					// Update table and info
					calculate_pages();
					reconstruct_keys_table();
				}
			} // End of 'prev_page' function

			/*FUNCTION*/
			this.go_to_page = function() {
				var page_number = parseInt($('#page-number-input').val());
				if (page_number) {
					if (page_number <= totalpages && page_number > 0) {
						page = page_number;
						calculate_pages();
						reconstruct_keys_table();
					}
				}
			} // End of 'go_to_page' function

			/*FUNCTION*/			
			this.jump_to = function() {
				var key = $('#jump-to-input').val();
				if (key) {					
					var riak_bucket = new RiakBucket(bucket_name, riak_client);
					// Try to get bucket
					riak_bucket.get(key, function(status, object) {
						if (status == 'ok') {
							window.location = '/riak/8protons.com_riaktive/document.html?bucket_name=' + bucket_name + '&document_key=' + key;
						}
						else {
							$.riaktive.show_notification('There is no document with key: ' + key);
						}
					}); // End of riak_bucket.get
				} 
				else {
					$.riaktive.show_notification('Key can not be empty');
				}
			} // End of 'jump_to' function

			/*FUNCTION*/
			this.change_property = function() {
				var prop_name = $(this).val();
				var prop_value = '';
				var found_input = {};
			
				var temp_type_text = ['n_val', 'r', 'w', 'dw', 'rw'];
				var valid_values = ['all', 'quorum', 'one']
				var temp_obj = '';

				var errors = 0;

				if (prop_name) {
					// Check text values
					if (temp_type_text.indexOf(prop_name) >= 0) { // a
						prop_value = $(this).parent().find('input[type="text"]').val() || '';

						if (prop_value) {
							if (prop_name == 'n_val') { // b
								prop_value = parseInt(prop_value);
								if (prop_value <= 0) {
									errors += 1;								
									$.riaktive.show_notification('n_val should be greater than 0');
								}
							} // End of 'b'
							else {
									// Test string to numerical %) Yeah, strange method
									if (parseInt(prop_value) <= 0 || parseInt(prop_value) > 0) {
										// Check Integer values
										if (parseInt(prop_value) <= 0 || parseInt(prop_value) > current_bucket.props['n_val']) {
											errors += 1;
											$.riaktive.show_notification('Errors with r-d-dw-rw values');
										}							

									} else {
										// Check text values
										if (valid_values.indexOf(prop_value) == -1) {
											errors += 1;
											$.riaktive.show_notification('Errors with r-d-dw-rw values');
										} 
										else {									
											prop_value = '"' + prop_value + '"';
										}
									}
							} 
						}
						else {	
							errors += 1;
							$.riaktive.show_notification('Values can not be empty!');
						}

						
					} // End of 'a' block
					else if (prop_name === 'allow_mult' || prop_name === 'last_write_wins') {
						prop_value = $(this).parent().find('input[type="checkbox"]').attr('checked') || false;
					}
					
					if (errors == 0) { // c
						temp_obj = '{"props":{"' + prop_name + '": ' + prop_value + ' }}';

						$.ajax({ 
								url: '/riak/' + current_bucket.props.name,
								type: 'PUT',
								contentType: 'application/json',
								data: temp_obj,
								success: function() {
									// Update current bucket
									current_bucket.props[prop_name] = prop_value;
									$.riaktive.show_notification('Property "' + prop_name + '" has been successfuly updated');
								},
						}); // End of Ajax request
					} // c
				}
				else {
					$.riaktive.show_notification('Oh-oh! Error! There is no property!')
				}
			} // End of 'change_property' function

			/*FUNCTION*/
			this.content_type_select = function() {
				if ($(this).val() == 'default') {
					$('#add-document-div input#content-type-input').val('application/octet-stream');
				}
				else {
					$('#add-document-div input#content-type-input').val($(this).val());
				}
			} // End of 'content_type_select' function

			/*FUNCTION*/
			this.select_text_type = function() {
				$('#add-document-div input#radio-file').removeAttr('checked');
				$('#add-document-div #radio-text-div').show();
				$('#add-document-div #radio-file-div').hide();
			} // End of 'select_text_type' function

			/*FUNCTION*/
			this.select_file_type = function() {
				// Check browser compatibility with HTML5 File API
				if (window.File && window.FileReader) {
					$('#add-document-div input#radio-text').removeAttr('checked');
					$('#add-document-div #radio-text-div').hide();
					$('#add-document-div #radio-file-div').show();			
				} else {
					// Emulate click on element to fire the function
					$('#add-document-div input#radio-text').click();
					// Sorry message :D
					alert('Riaktive says: The HTML5 File API are not supported in this browser. Update\Install new one and Enjoy!');
				}			
			} // End of 'select_file_type' function

			/*FUNCTION*/			
			this.stop_read_file = function() {
				if (reader) reader.abort();
			} // End of 'stop_read_file' function

			/*FUNCTION*/
			// File Upload function (with HTML5 File API)
			this.handle_file_select = handleFileSelect;

			/*FUNCTION*/
			this.delete_document = function() {
				var key = $(this).val();
				if (key) {
					if (confirm("Riaktive says: Are you sure you want delete the document with key: " + key + "? It's permanently!")) {					
						var riak_bucket = new RiakBucket(bucket_name, riak_client);
						// Try to remove the bucket
						riak_bucket.remove(key, function(success, request) {
							if (success) {
								// If success then delete bucket from array (we can request new object, but it's to expensive)
								current_bucket.keys.splice(current_bucket.keys.indexOf(key), 1);

								// Recalculate length of bucket array
								current_bucket_length = current_bucket.keys.length;
								
								// Update and inform
								calculate_pages();
								reconstruct_keys_table();
								$.riaktive.show_notification('The Document with key: "' + key + '" has been successfuly removed from my memory');
							}
						}); // End of riak_bucket.remove
					} // End of confirmation dialog
				}
			} // End of 'delete_document' function
			
			/*FUNCTION*/
			this.add_document_box_onstart = function() {
				// Clear values - we need to create a new document without 'ghosts' =)
				$('#add-document-div #key').val('');
				$('#add-document-div #content-type-select').attr('selectedIndex', 0);
				$('#add-document-div #content-type-input').val('application/octet-stream');
				$('#add-document-div #vclock').val('');
				$('#add-document-div #riak-links').find('div').remove();

				$('#add-document-div input#radio-text').removeAttr('checked');
				$('#add-document-div input#radio-file').removeAttr('checked');

				$('#add-document-div #radio-text-div').hide();
				$('#add-document-div #radio-file-div').hide();
				$('#add-document-div #radio-file-div #file').val('');
				$('#add-document-div #radio-text-div textarea').val('');
			} // End of 'add_document_box_onstart' function
		
			this.add_link_input = function() {
				$(this).parent().append('<div>Link: <input type="text" class="riaklink" size="30" value="" /> Riaktag: <input class="riaktag" type="text" value="" /><button class="delete">Remove Link</button></div>');
			}

			/*FUNCTION*/
			// Save document logic
			this.save_document = function() {
				var all_cool = true;
				var body = '';
				// Get the Key value
				var key = $('#add-document-div #key').val() || '';
				var key_exist = current_bucket.keys.indexOf(key) >= 0;
				if (key_exist)  { 
					if (confirm("The key '" + key + "' is already exist. Are you sure you want update it?")) {
						all_cool = true;
					} 
					else	{
						all_cool = false;
					}
				}

				// Get the Content-type value
				var content_type = $('#add-document-div #content-type-input').val() || 'application/octet-stream';
			
				// If browser support HTML5 FileReader and file uploaded - get the Body value. 
				if ($('#add-document-div #radio-file').attr('checked') && reader && reader.result) {
					body = reader.result;
				}
				else {
					body = $('#add-document-div #radio-text-div textarea').val() || '';
				}

				// Create the temp document
				temp_document = new RiakObject(bucket_name, key, riak_client, body, content_type, $('#add-document-div #vclock').val() || '');
				
				var temp_link = '';
				var temp_tag = '';
				var element;
				var links_errors_count = 0;
				var links_container = $('#add-document-div #riak-links').find('div');
				for (var i = 0; i <= links_container.length; i++) {
					if (links_container[i]) { // a
						element = links_container[i];
						temp_link = element.children[0].value;
						temp_tag = element.children[1].value;
						if (temp_link  === "" || temp_tag === "" || temp_link.indexOf('/') == -1 || temp_link.indexOf('/riak/') == -1) {
							links_errors_count += 1;
							if (temp_link  === "" || temp_link.indexOf('/') == -1) element.children[0].style.border = '2px solid red';
							if (temp_tag === "") element.children[1].style.border = '2px solid red';							
						}
						else {
							element.children[0].style.border = '';
							element.children[1].style.border = '';
							temp_document.addLink(temp_link, temp_tag, true);
						}
					} // End of 'a' block
				} // End of FOR iterator

				if (links_errors_count > 0) {
					all_cool = false; // :(~p)
					$.riaktive.show_notification('There are some errors with links. Please fix it :)')
				}

				if (all_cool) { // b
					temp_document.store(function(status, object, request) {
						if (status === 'ok') { // c
							// Push new document to the list of documents only if it does not exist
							if (!key_exist) {
								current_bucket.keys.push(object.key);
								// Recalculate the length
								current_bucket_length += 1;
								$.riaktive.show_notification('Document "' + object.key + '" has been successfuly added');
							}
							else {
								$.riaktive.show_notification('The Document with key "' + key + '" has been successfuly updated')
							}

							// Close the Fancybox
							$.fancybox.close();							
							// Update information and tables
							calculate_pages();
							reconstruct_keys_table();

						} // End of 'c' block
					}); // End of temp_document.store
				} // End of 'b' block
				else {
					$.riaktive.show_notification('Hmm... something goes wrong. Try again!')
				}
			} // End of 'save_document' function			

			/* HELP FUNCTIONS */
			function fill_most_used(most_used_param) {
				// Value for table Caption
				most_used_param.riaktive_table_caption = $('#riaktive-table caption');

				// Value for page number input
				most_used_param.page_number = $('#page-number-input');

				// Value for span which contains useful information about current position
				most_used_param.riaktive_table_nav_span = $('#content #riaktive-table tbody.nav span');

				// Value for table content element
				most_used_param.riaktive_table_content = $('#content #riaktive-table tbody.content');
			
				// For file load progress
				most_used_param.progress_bar_percent = $('#add-document-div #progress-bar .percent');
		
			} // End of 'fill_most_used' function

			function fill_props_table() {
				var helper = '';
				var html = '<tr id="name"><th>name</th><td class="actions">' + current_bucket.props.name + '</td></tr>';
				html += '<tr id="n_val"><th>n_val</th><td class="actions"><input type="text" value="' + current_bucket.props.n_val + '" /><button class="ok" value="n_val">Update</button><br /><span class="desc">n_val (integer > 0) - the number of replicas for objects in this bucket</span></td></tr>';
				// allow_mult
				helper = current_bucket.props.allow_mult ? 'checked="checked"' : '';
				html += '<tr id="allow_mult"><th>allow_mult</th><td class="actions"><input type="checkbox" ' + helper + ' /><button class="ok" value="allow_mult">Update</button><br /><span class="desc">allow_mult (true or false) - whether to allow sibling objects to be created (concurrent updates)</span></td></tr>';
				//last_write_wins
				helper = current_bucket.props.last_write_wins ? 'checked="checked"' : '';
				html += '<tr id="last_write_wins"><th>last_write_wins</th><td class="actions"><input type="checkbox" ' + helper + ' /><button class="ok" value="last_write_wins">Update</button><br /><span class="desc">last_write_wins (true or false) - whether to ignore object history (vector clock) when writing</span></td></tr>';
				
				html += '<tr id="precommit"><th>precommit</th><td class="actions">' + JSON.stringify(current_bucket.props.precommit) + '</td></tr>';
				html += '<tr id="postcommit"><th>postcommit</th><td class="actions">' + JSON.stringify(current_bucket.props.postcommit) + '</td></tr>';
				html += '<tr id="chash_keyfun"><th>chash_keyfun</th><td class="actions">' + JSON.stringify(current_bucket.props.chash_keyfun) + '</td></tr>';
				html += '<tr id="linkfun"><th>linkfun</th><td class="actions">' + JSON.stringify(current_bucket.props.linkfun) + '</td></tr>';
				html += '<tr id="old_vclock"><th>name</th><td class="actions">' + current_bucket.props.old_vclock + '</td></tr>';
				html += '<tr id="young_vclock"><th>young_vclock</th><td class="actions">' + current_bucket.props.young_vclock + '</td></tr>';
				html += '<tr id="big_vclock"><th>big_vclock</th><td class="actions">' + current_bucket.props.big_vclock + '</td></tr>';
				html += '<tr id="small_vclock"><th>small_vclock</th><td class="actions">' + current_bucket.props.small_vclock + '</td></tr>';
				
				//R-D-DW-RW values
				html += '<tr><th>&nbsp;</th><td class="actions"><strong>r, w, dw, rw - default quorum values for operations on keys in the bucket. Valid values are: <br />- All - all nodes must respond <br /> - quorum - (n_val/2) + 1 nodes must respond. This is the default. <br /> - one - equivalent to 1 <br /> - Any integer - must be less than or equal to n_val</strong></td></tr>';					
				html += '<tr id="r"><th>r</th><td class="actions"><input type="text" value="' + current_bucket.props.r + '" /><button class="ok" value="r">Update</button></td></tr>';
				html += '<tr id="w"><th>w</th><td class="actions"><input type="text" value="' + current_bucket.props.w + '" /><button class="ok" value="w">Update</button></td></tr>';
				html += '<tr id="dw"><th>dw</th><td class="actions"><input type="text" value="' + current_bucket.props.dw + '" /><button class="ok" value="dw">Update</button></td></tr>';
				html += '<tr id="rw"><th>rw</th><td class="actions"><input type="text" value="' + current_bucket.props.rw + '" /><button class="ok" value="rw">Update</button></td></tr>';

				// Fill the Properties table with new data
				$('#prop-table tbody.content').html(html);

			} // End of 'fill_props_table' function

			// Some crapy page arithmetics and elements updates :D
			function calculate_pages() {
					// If count of keys is zero (oh no - it's 0!! :D) - assign the defaults to variables
					if (current_bucket_length == 0) {
						showcount = 10;
						page = 1;
						totalpages = 1;
					} 
					else {
						//If showcount great than whole collection size 
						//if (showcount > current_bucket_length) showcount = current_bucket_length;

						// Calculate totalpages variable. parseInt is for integer division
						totalpages = parseInt(current_bucket_length / showcount);
						if (totalpages == 0) totalpages = 1;
						// Check page and totalpages for 'out of array' problem
						if (page > totalpages) page = totalpages;							
					}
					// Update the Page Number Go field
					most_used.page_number.val(page);
					// Update the Caption of table
					most_used.riaktive_table_caption.html('Documents (Total Pages: ' + totalpages + ', Page: ' + page + ')' );
			} // End of 'calculate_pages' function
			
			// Magic function :D Ok, not so magic. Just reconstruct list of values in Keys table
			function reconstruct_keys_table() {
				// If length of Key array is 0 - remove all elements from html Keys table
				if (current_bucket_length > 0) { 
					var html = '';
				  var slice_end = 0;
					var slice_start = 0;
					var displayed_elem = [];

					// Calculate the right slice borders
					var slice_start = (page - 1) * showcount;

					// If current page is last - show all element from slice_start to end of array
					if (page == totalpages || (slice_start + showcount) >= current_bucket_length) {
						slice_end = current_bucket_length;
					} 
					else {
						slice_end = slice_start + showcount;
					}
								
					// Slice the original array
					displayed_elem = current_bucket.keys.slice(slice_start, slice_end);
					
					var displayed_elem_length = displayed_elem.length;
					// Some iterates to get list of elements
					for (var i = 0; i <= displayed_elem_length - 1; i++) {
						html += '<tr id="' + displayed_elem[i] + '"><th><a href="document.html?bucket_name=' + bucket_name + "&document_key=" + displayed_elem[i] + '">' + displayed_elem[i] + '</a></th>' + '<td class="actions"><button class="delete" value="' + displayed_elem[i] + '">Delete</button></td></tr>';
					}

					//Remove all element from table
					most_used.riaktive_table_content.empty();

					// Yeah, strange, but this... wow! fill the table =)
					most_used.riaktive_table_content.html(html);										

					// Update Navigation span with new information
					most_used.riaktive_table_nav_span.html('Showing ' + (slice_start + 1) + '-' + slice_end + ' of ' + current_bucket_length + ' documents')
				}
				else {
					most_used.riaktive_table_content.empty();
				}

			} // End of 'reconstruct_keys_table' function
			
			//Not my functions - got it from cool site - http://www.html5rocks.com			
			function handleFileSelect() {				
				// Reset progress indicator on new file selection.
				most_used.progress_bar_percent.css('width', '0%');
				most_used.progress_bar_percent.html('0%');

				reader = new FileReader();
				reader.onerror = errorHandler;
				reader.onprogress = updateProgress;
				reader.onabort = function(e) {
				  alert('Riaktive says: File read cancelled');
				};
				reader.onloadstart = function(e) {
				  $('#add-document-div #progress-bar').addClass('loading');
				};
				reader.onload = function(e) {
				  // Ensure that the progress bar displays 100% at the end.
					most_used.progress_bar_percent.css('width', '100%');
					most_used.progress_bar_percent.html('100%');
					$.riaktive.show_notification('File has been successfuly uploaded to temporary vault');
					
					// Automatically set content-type
					var content_type_by_file = $('#add-document-div #file').attr('files')[0].type || 'application/octet-stream';
					$('#add-document-div input#content-type-input').val(content_type_by_file);
					$('#add-document-div #content-type-select').val(content_type_by_file);
				  //setTimeout("document.getElementById('progress_bar').className='';", 2000);
				}

				// Read in the image file as a binary string.
				reader.readAsBinaryString($(this).attr('files')[0]);
			} // End of 'handleFileSelect' function

			function errorHandler(evt) {
				switch(evt.target.error.code) {
				  case evt.target.error.NOT_FOUND_ERR:
				    alert('File Not Found!');
				    break;
				  case evt.target.error.NOT_READABLE_ERR:
				    alert('File is not readable');
				    break;
				  case evt.target.error.ABORT_ERR:
				    break; // noop
				  default:
				    alert('An error occurred reading this file.');
				};
			} // End of 'errorHandler' function

			function updateProgress(evt) {
				// evt is an ProgressEvent.
				if (evt.lengthComputable) {
				  var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
				  // Increase the progress bar length.
				  if (percentLoaded < 100) {
						most_used.progress_bar_percent.css('width', percentLoaded + '%');
						most_used.progress_bar_percent.html(percentLoaded + '%');
				  }
				}
			} // End of 'updateProgress' function

		}, // End of BucketPage property

		/*PROPERTY*/
		DocumentPage: function() {
			var riak_client = new RiakClient();

			var current_bucket_name = getQuerystring('bucket_name', "");
			var current_document_key = getQuerystring('document_key', "");

			var current_bucket = {};
			var current_document = {};

			var clear_content_type = '';

			var image_types = ['image/gif', 'image/jpeg', 'image/png', 'image/tiff', 'image/vnd.microsoft.icon'];
			var text_types = ['text/html', 'application/javascript', 'application/json', 'text/plain', 'text/css', 'application/soap+xml', 'application/xhtml+xml', 'application/xml-dtd', 'text/csv', 'text/javascript', 'text/xml'];

			var most_used = {};

			var reader;

			/*FUNCTION*/
			this.init = function () {
				if (current_bucket_name && current_document_key) {
					// Add header links
					$("#header .wrapper").append('<a class="path" href="/riak/8protons.com_riaktive/bucket.html?bucket_name=' + current_bucket_name + '">' + current_bucket_name + '</a>');
					$("#header .wrapper").append('<a class="path" href="' + document.URL + '">' + current_document_key + '</a>');
					
					// Assign cache variables
					most_used.radio_variant = $('#content #document-content #radio-variant');
					most_used.radio_text = $('#content #document-content #radio-text');
					most_used.radio_file = $('#content #document-content #radio-file');

					most_used.document_body_variant = $('#document-content #document-body #variant');
					most_used.document_body_text = $('#document-content #document-body #text');
					most_used.document_body_file = $('#document-content #document-body #file');

					most_used.progress_bar_percent = $('#document-content #progress-bar .percent');

					// Add live-function to delete element of riak-links list
					$('#content #document-information #riak-links button.delete').live('click', function() {
						$(this).parent().remove();
					});

					$('#content #document-content #radio-variant').attr('checked', 'checked');
					$('#content #document-content #radio-text').removeAttr('checked');
					$('#content #document-content #radio-file').removeAttr('checked');
				
					current_bucket = new RiakBucket(current_bucket_name, riak_client);
					//Try to get the current document
					current_bucket.get(current_document_key, function(status, object, req) {
						if (status === 'ok') {
							current_document = object;
							// Browsers may add Charset UTF 8 string to content type when you are save text data.
							// But we need a Clear content type
							if (current_document.contentType.indexOf(';') > 0) {
								clear_content_type = current_document.contentType.substring(0, current_document.contentType.indexOf(';'));
							} 
							else {
								clear_content_type = current_document.contentType;
							}
							update();
						}						
					}); // End of current_bucket.get
				}
				else {
					window.location = '/riak/8protons.com_riaktive/index.html';
				}
			} // End of 'init' function

			this.delete_document = function() {
				current_document.remove(function(success) {
					if (success) {
						window.location = '/riak/8protons.com_riaktive/bucket.html?bucket_name=' + current_bucket_name;
					}
				});
			}

			/*FUNCTION*/
			this.radio_variant_click = function() {
				most_used.document_body_variant.show();
				most_used.document_body_text.hide();
				most_used.document_body_file.hide();

				most_used.radio_text.removeAttr('checked');
				most_used.radio_file.removeAttr('checked');
			} // End of 'radio_variant_click' function

			/*FUNCTION*/
			this.radio_text_click = function() {
				most_used.document_body_text.show();
				most_used.document_body_variant.hide();
				most_used.document_body_file.hide();

				most_used.radio_variant.removeAttr('checked');
				most_used.radio_file.removeAttr('checked');
			} // End of 'radio_text_click' function

			/*FUNCTION*/
			this.radio_file_click = function() {
				most_used.document_body_file.show();
				most_used.document_body_variant.hide();
				most_used.document_body_text.hide();

				most_used.radio_variant.removeAttr('checked');
				most_used.radio_text.removeAttr('checked');
			} // End of 'radio_file_click' function

			/*FUNCTION*/
			// File Upload function (with HTML5 File API)
			this.handle_file_select = handleFileSelect;

			/*FUNCTION*/			
			this.add_link_input = function() {
				$(this).parent().append('<div>Link: <input type="text" class="riaklink" size="60" value="" /> Riaktag: <input class="riaktag" type="text" value="" /><button class="delete">Remove Link</button></div>');
			} // End of 'add_link_input' function

			/*FUNCTION*/
			this.content_type_select = function() {
				if ($(this).val() == 'default') {
					$('#document-information input#content-type-input').val('application/octet-stream');
				}
				else {
					$('#document-information input#content-type-input').val($(this).val());
				}
			} // End of 'content_type_select' function

			/*FUNCTION*/			
			this.stop_read_file = function() {
				if (reader) reader.abort();
			} // End of 'stop_read_file' function

			/*FUNCTION*/
			// Save document logic
			this.save_document = function() {
				var all_cool = true;
			
				// If browser support HTML5 FileReader and file uploaded - get the Body value. 
				if (most_used.radio_file.attr('checked') && reader && reader.result) {
					current_document.body = reader.result;					
				}
				// If radio_text checked and textarea exist - body is html of textarea
				if (most_used.radio_text.attr('checked') && most_used.document_body_text.find('textarea').val() ){
					current_document.body = most_used.document_body_text.find('textarea').val() || '';
				} 
				// And - if textarea in variant div does not have html - then body is equal current document body
				if (most_used.radio_variant.attr('checked') && most_used.document_body_variant.find('textarea').val() !== undefined)
				{										
					current_document.body = most_used.document_body_variant.find('textarea').val();
				}

				// Get the Content-type value
				current_document.contentType = $('#content #document-information #content-type-input').val() || 'application/octet-stream';
				clear_content_type = current_document.contentType;
				current_document.clearLinks();
				// Add standart link
				current_document.addLink('/riak/' + current_bucket_name, 'rel=up');

				// Parse links
				var temp_link = '';
				var temp_tag = '';
				var element;
				var links_errors_count = 0;
				var links_container = $('#content #document-information #riak-links').find('div');
				for (var i = 0; i <= links_container.length; i++) {
					if (links_container[i]) { // a
						element = links_container[i];
						temp_link = element.children[0].value;
						temp_tag = element.children[1].value;
						if (temp_link  === "" || temp_tag === "" || temp_link.indexOf('/') == -1 || temp_link.indexOf('/riak/') == -1) {
							// We have error! Oh no!
							links_errors_count += 1;

							// Check values to show interactive error 
							if (temp_link  === "" || temp_link.indexOf('/') == -1 || temp_link.indexOf('/riak/') == -1) {
								element.children[0].style.border = '2px solid red';
							} else { element.children[0].style.border = ''; }

							// Check values to show interactive error 
							if (temp_tag === "") {
								element.children[1].style.border = '2px solid red';							
							} else {element.children[1].style.border = '';}

						}
						else {
							element.children[0].style.border = '';
							element.children[1].style.border = '';
							current_document.addLink(temp_link, temp_tag, true);
						}
					} // End of 'a' block
				} // End of FOR iterator

				if (links_errors_count > 0) {
					all_cool = false; // :(~p)
					$.riaktive.show_notification('There are some errors with links. Please fix it :)')
				}

				if (all_cool) { // b
					current_document.store(function(status, object, request) {
						if (status === 'ok') { // c
							$.riaktive.show_notification('Document "' + object.key + '" has been successfuly updated');
							update();
							
						} // End of 'c' block
					}); // End of temp_document.store
				} // End of 'b' block
				else {
					$.riaktive.show_notification('Hmm... something goes wrong. Try again!')
				}
			} // End of 'save_document' function	

			/*HELP FUNCTIONS*/
			/*FUNCTION*/
			function update() {
				// Fill elements with values
				$('#content #document-information #document-bucket-title').html('Document Bucket: <span>' + current_document.bucket + '</span>');
				$('#content #document-information #document-key-title').html('Document Key: <span>' + current_document.key + '</span>');
				$('#content #document-information input#content-type-input').val(clear_content_type);
				$('#content #document-information #content-type-select').val(clear_content_type);
				$('#content #document-information #vclock').val(current_document.vclock);
				
				

				most_used.radio_variant.click();

				var body = 'Empty';
				if (image_types.indexOf(clear_content_type) >= 0) {
					body = '<img src="/riak/' + current_document.bucket + '/' + current_document.key + '" alt="Interesting picture" />';
				} else if (text_types.indexOf(clear_content_type) >= 0){
					body = '<textarea style="width:100%;height:100%;">' + current_document.body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</textarea>';
				} else {
					body = 'File with content-type: ' + clear_content_type;
				}
				
				$('#content #document-content #document-body #variant').html(body);

				fill_links_div();

			} // End of 'update' function			

			/*FUNCTION*/
			function fill_links_div() {
				$('#document-information #riak-links').find('p').remove();
				var html = '';
				var rel = ''
				if (current_document.links) { // a
					for (var elem in current_document.links) {
						if (current_document.links[elem].tag == 'rel=up') {
							rel = '<p>Riak always added this link: <span class="desc">Link: ' + current_document.links[elem].target + ' Rel: ' + current_document.links[elem].tag + '</span></p>';
						}
						else {
							html += '<div>Link: <input class="riaklink" type="text" size="60" value="' + current_document.links[elem].target + '" /> Riaktag: <input type="text" class="riaktag" value="' + current_document.links[elem].tag + '" /><button class="delete">Remove Link</button></div>';
						}
						
					} // End of FOR iterator
					$('#content #document-information #riak-links').append(rel + html);
				} // End of 'a' block
				else {
					$('#content #document-information #riak-links-title').html('Links: 0');
				}
			} // End of 'fill_links_div' function	

			//Not my functions - got it from cool site - http://www.html5rocks.com			
			function handleFileSelect() {				
				// Reset progress indicator on new file selection.
				most_used.progress_bar_percent.css('width', '0%');
				most_used.progress_bar_percent.html('0%');

				reader = new FileReader();
				reader.onerror = errorHandler;
				reader.onprogress = updateProgress;
				reader.onabort = function(e) {
				  alert('Riaktive says: File read cancelled');
				};
				reader.onloadstart = function(e) {
				  $('#document-content #document-body #progress-bar').addClass('loading');
				};
				reader.onload = function(e) {
				  // Ensure that the progress bar displays 100% at the end.
					most_used.progress_bar_percent.css('width', '100%');
					most_used.progress_bar_percent.html('100%');
					$.riaktive.show_notification('File has been successfuly uploaded to temporary vault');
					var content_type_by_file = $('#file-input').attr('files')[0].type || 'application/octet-stream';
					$('#document-information input#content-type-input').val(content_type_by_file);
					$('#document-information #content-type-select').val(content_type_by_file);
					clear_content_type = content_type_by_file;
				  //setTimeout("document.getElementById('progress_bar').className='';", 2000);
				}

				// Read in the image file as a binary string.
				reader.readAsBinaryString($(this).attr('files')[0]);
			} // End of 'handleFileSelect' function

			function errorHandler(evt) {
				switch(evt.target.error.code) {
				  case evt.target.error.NOT_FOUND_ERR:
				    alert('File Not Found!');
				    break;
				  case evt.target.error.NOT_READABLE_ERR:
				    alert('File is not readable');
				    break;
				  case evt.target.error.ABORT_ERR:
				    break; // noop
				  default:
				    alert('An error occurred reading this file.');
				};
			} // End of 'errorHandler' function

			function updateProgress(evt) {
				// evt is an ProgressEvent.
				if (evt.lengthComputable) {
				  var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
				  // Increase the progress bar length.
				  if (percentLoaded < 100) {
						most_used.progress_bar_percent.css('width', percentLoaded + '%');
						most_used.progress_bar_percent.html(percentLoaded + '%');
				  }
				}
			} // End of 'updateProgress' function

		} // End of DocumentPage property 

	}); // End of jQuery extend function

	/*FUNCTION*/
	$.riaktive.sidebar = function() {
		$.getJSON('/stats', function(data) {
			if (data) {

				var html = '<div id="logo">';
				html +=	'<a href="http://riak.basho.com"><img src="/riak/8protons.com_riaktive/riak-logo.png" alt="riak-logo" /></a>';
				html +=	'<div id="protons-logo"><h1><a href="http://8protons.com">8Protons</a></h1></div>';
				html +=	'</div>';
				html +=	'<h2>Server Status</h2>';
				html +=	'<div id="server-status">';
				html +=	'<div id="server-status-div"></div>';
				html +=	'<h3 id="fsmtime">FSM Time</h3>';
				html +=	'<div id="fsmtime-div" style="display:none;"></div>';
				html +=	'<h3 id="ring">Ring Information</h3>';
				html +=	'<div id="ring-div" style="display:none;"></div>';
				html +=	'<h3 id="cpumemory">CPU\Memory</h3>';
				html +=	'<div id="cpumemory-div" style="display:none;"></div>';
				html +=	'<h3 id="versions">Versions</h3>';
				html +=	'<div id="versions-div" style="display:none;"></div>';
				html +=	'<h3 id="system">System</h3>';
				html +=	'<div id="system-div" style="display:none;"></div>';
				html +=	'<span class="desc">(click to show\\hide)</span>';
				html +=	'</div>';
				$('#sidebar').html(html);
			
				/*Uh... main info*/
				html = '<table>';
				html += '<tr><td>Nodename:</td><td class="info"> ' + data.nodename + '</td></tr>';
				html += '<tr><td>Sys Process Count:</td><td class="info"> ' + data.sys_process_count + '</td></tr>';
				html += '<tr><td>PBC Active:</td><td class="info"> ' + data.pbc_active + '</td></tr>';
				html += '<tr><td>PBC Conn:</td><td class="info"> ' + data.pbc_connects + '</td></tr>';
				html += '<tr><td>PBC Conn Total:</td><td class="info"> ' + data.pbc_connects_total + '</td></tr>';
				html += '<tr><td>Read Repairs:</td><td class="info"> ' + data.read_repairs + '</td></tr>';
				html += '<tr><td>Read Repairs Total:</td><td class="info"> ' + data.read_repairs_total + '</td></tr>';
				html += '</table>';

				html += '<h4>Node Statistic</h4>';
				html += '<table>';
				html += '<tr><td>Node Gets:</td><td class="info"> ' + data.node_gets + '</td></tr>';
				html += '<tr><td>Node Gets Total:</td><td class="info"> ' + data.node_gets_total + '</td></tr>';
				html += '<tr><td>Node Puts:</td><td class="info"> ' + data.node_puts + '</td></tr>';
				html += '<tr><td>Node Puts Total:</td><td class="info"> ' + data.node_puts_total + '</td></tr>';
				html += '</table>';

				html += '<h4>Virtual Node Statistic</h4>';
				html += '<table>';
				html += '<tr><td>VNode Gets:</td><td class="info"> ' + data.vnode_gets + '</td></tr>';
				html += '<tr><td>VNode Gets Total:</td><td class="info"> ' + data.vnode_gets_total + '</td></tr>';
				html += '<tr><td>VNode Puts:</td><td class="info"> ' + data.vnode_puts + '</td></tr>';
				html += '<tr><td>VNode Puts Total:</td><td class="info"> ' + data.vnode_puts_total + '</td></tr>';
				html += '</table>';
				$('#server-status-div').html(html);

				/*Ich... fill about FSM time*/
				html = '<h4>Get FSM Time</h4>';
				html += '<table>';
				html += '<tr><td>FSM Time 95:</td><td class="info"> ' + data.node_get_fsm_time_95 + '</td></tr>';
				html += '<tr><td>FSM Time 99:</td><td class="info"> ' + data.node_get_fsm_time_99 + '</td></tr>';
				html += '<tr><td>FSM Time 100:</td><td class="info"> ' + data.node_get_fsm_time_100 + '</td></tr>';
				html += '<tr><td>FSM Time Median:</td><td class="info"> ' + data.node_get_fsm_time_median + '</td></tr>';
				html += '<tr><td>FSM Time Mean:</td><td class="info"> ' + data.node_get_fsm_time_mean + '</td></tr>';
				html += '</table>';

				html += '<h4>Put FSM Time</h4>';
				html += '<table>';
				html += '<tr><td>FSM Time 95:</td><td class="info"> ' + data.node_put_fsm_time_95 + '</td></tr>';
				html += '<tr><td>FSM Time 99:</td><td class="info"> ' + data.node_put_fsm_time_99 + '</td></tr>';
				html += '<tr><td>FSM Time 100:</td><td class="info"> ' + data.node_put_fsm_time_100 + '</td></tr>';
				html += '<tr><td>FSM Time Median:</td><td class="info"> ' + data.node_put_fsm_time_median + '</td></tr>';
				html += '<tr><td>FSM Time Mean:</td><td class="info"> ' + data.node_put_fsm_time_mean + '</td></tr>';
				html += '</table>';
				$('#fsmtime-div').html(html);

				/*Ich... fill about System*/
				html = '<table>';
				html += '<tr><td>Global Heaps Size:</td><td class="info"> ' + data.sys_global_heaps_size + '</td></tr>';
				html += '<tr><td>Heap Type:</td><td class="info"> ' + data.sys_heap_type + '</td></tr>';
				html += '<tr><td>Logical Processors:</td><td class="info"> ' + data.sys_logical_processors + '</td></tr>';
				html += '<tr><td>OTP Release:</td><td class="info"> ' + data.sys_otp_release + '</td></tr>';
				html += '<tr><td>SMP Support:</td><td class="info"> ' + data.sys_smp_support + '</td></tr>';
				html += '<tr><td>System Architecture:</td><td class="info"> ' + data.sys_system_architecture + '</td></tr>';
				html += '<tr><td>Threads Enabled:</td><td class="info"> ' + data.sys_threads_enabled + '</td></tr>';
				html += '<tr><td>Thread Pool Size:</td><td class="info"> ' + data.sys_thread_pool_size + '</td></tr>';
				html += '<tr><td>Wordsize:</td><td class="info"> ' + data.sys_wordsize + '</td></tr>';
				html += '</table>';
				$('#system-div').html(html);

				/*Get all ring-info*/
				html = '<table>';
				html += '<tr><td>Ring Partitions:</td><td class="info"> ' + data.ring_num_partitions + '</td></tr>';
				html += '<tr><td>Ring Creation Size:</td><td class="info"> ' + data.ring_creation_size + '</td></tr>';
				html += '</table>';

				html += '<h4>Connected Nodes</h4>';
				html += '<table>';
				for (var elem in data.connected_nodes) {
					html += '<tr><td>' + elem + ':</td><td class="info"> ' + data.connected_nodes[elem] + '</td></tr>';						
				}
				html += '</table>';

				html += '<h4>Ring Members</h4>';
				html += '<table>';
				for (var elem in data.ring_members) {
					html += '<tr><td>' + elem + ':</td><td class="info"> ' + data.ring_members[elem] + '</td></tr>';						
				}
				html += '</table>';
				$('#ring-div').html(html);

				/*Fill info about CPU-Memory*/
				html = '<table>';
				html += '<tr><td>CPU Avg1:</td><td class="info"> ' + data.cpu_avg1 + '</td></tr>';
				html += '<tr><td>CPU Avg5:</td><td class="info"> ' + data.cpu_avg5 + '</td></tr>';
				html += '<tr><td>CPU Avg15:</td><td class="info"> ' + data.cpu_avg15 + '</td></tr>';
				html += '<tr><td>CPU NProcs:</td><td class="info"> ' + data.cpu_nprocs + '</td></tr>';
				html += '<tr><td>Memory Total:</td><td class="info"> ' + (data.mem_total / 1048576).toFixed(2) + ' Mb' + '</td></tr>';
				html += '<tr><td>Memory Allocated:</td><td class="info"> ' + (data.mem_allocated / 1048576).toFixed(2) + ' Mb' +  '</td></tr>';
				html += '</table>';
				$('#cpumemory-div').html(html);

				/*Ach... :D Fill info about Versions*/
				html = '<table>';
				html += '<tr><td>Sys Driver:</td><td class="info"> ' + data.sys_driver_version + '</td></tr>';
				html += '<tr><td>Riak Core:</td><td class="info"> ' + data.riak_core_version + '</td></tr>';
				html += '<tr><td>Riak KV:</td><td class="info"> ' + data.riak_kv_version + '</td></tr>';
				html += '<tr><td>Bitcask:</td><td class="info"> ' + data.bitcask_version + '</td></tr>';
				html += '<tr><td>Luke:</td><td class="info"> ' + data.luke_version + '</td></tr>';
				html += '<tr><td>Webmachine:</td><td class="info"> ' + data.webmachine_version + '</td></tr>';
				html += '<tr><td>Mochiweb:</td><td class="info"> ' + data.mochiweb_version + '</td></tr>';
				html += '<tr><td>Erlang JavaScript:</td><td class="info"> ' + data.erlang_js_version + '</td></tr>';
				html += '<tr><td>Runtime Tools:</td><td class="info"> ' + data.runtime_tools_version + '</td></tr>';
				html += '<tr><td>Crypto:</td><td class="info"> ' + data.crypto_version + '</td></tr>';
				html += '<tr><td>OS Mon:</td><td class="info"> ' + data.os_mon_version + '</td></tr>';
				html += '<tr><td>SASL:</td><td class="info"> ' + data.sasl_version + '</td></tr>';
				html += '<tr><td>STDLib:</td><td class="info"> ' + data.stdlib_version + '</td></tr>';
				html += '<tr><td>Kernel:</td><td class="info"> ' + data.kernel_version + '</td></tr>';
				html += '<tr><td>Sys System:</td><td class="info"> ' + data.sys_system_version + '</td></tr>';
				html += '<tr><td>Storage Backend:</td><td class="info"> ' + data.storage_backend.replace(/_/g, ' ') + '</td></tr>';
				html += '</table>';
				$('#versions-div').html(html);

				$('#sidebar h3').click(function() {
					$('#' + $(this).context.id + '-div').slideToggle();
				});
			}
		}); // End of getJSON

	} // End of 'sidebar' function

})(jQuery);


// Parse Query String. Useful function from http://www.bloggingdeveloper.com
function getQuerystring(key, default_)
{
	if (default_==null) default_="";
	key = key.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regex = new RegExp("[\\?&]"+key+"=([^&#]*)");
	var qs = regex.exec(window.location.href);
	if(qs == null)
		return default_;
	else
		return qs[1];
}

// Gritter for notifications
(function($){$.gritter={};$.gritter.options={fade_in_speed:'medium',fade_out_speed:1000,time:6000}
$.gritter.add=function(params){try{return Gritter.add(params||{});}catch(e){var err='Gritter Error: '+e;(typeof(console)!='undefined'&&console.error)?console.error(err,params):alert(err);}}
$.gritter.remove=function(id,params){Gritter.removeSpecific(id,params||{});}
$.gritter.removeAll=function(params){Gritter.stop(params||{});}
var Gritter={fade_in_speed:'',fade_out_speed:'',time:'',_custom_timer:0,_item_count:0,_is_setup:0,_tpl_close:'<div class="gritter-close"></div>',_tpl_item:'<div id="gritter-item-[[number]]" class="gritter-item-wrapper [[item_class]]" style="display:none"><div class="gritter-top"></div><div class="gritter-item">[[image]]<div class="[[class_name]]"><span class="gritter-title">[[username]]</span><p>[[text]]</p></div><div style="clear:both"></div></div><div class="gritter-bottom"></div></div>',_tpl_wrap:'<div id="gritter-notice-wrapper"></div>',add:function(params){if(!params.title||!params.text){throw'You need to fill out the first 2 params: "title" and "text"';}
if(!this._is_setup){this._runSetup();}
var user=params.title,text=params.text,image=params.image||'',sticky=params.sticky||false,item_class=params.class_name||'',time_alive=params.time||'';this._verifyWrapper();this._item_count++;var number=this._item_count,tmp=this._tpl_item;$(['before_open','after_open','before_close','after_close']).each(function(i,val){Gritter['_'+val+'_'+number]=($.isFunction(params[val]))?params[val]:function(){}});this._custom_timer=0;if(time_alive){this._custom_timer=time_alive;}
var image_str=(image!='')?'<img src="'+image+'" class="gritter-image" />':'',class_name=(image!='')?'gritter-with-image':'gritter-without-image';tmp=this._str_replace(['[[username]]','[[text]]','[[image]]','[[number]]','[[class_name]]','[[item_class]]'],[user,text,image_str,this._item_count,class_name,item_class],tmp);this['_before_open_'+number]();$('#gritter-notice-wrapper').append(tmp);var item=$('#gritter-item-'+this._item_count);item.fadeIn(this.fade_in_speed,function(){Gritter['_after_open_'+number]($(this));});if(!sticky){this._setFadeTimer(item,number);}
$(item).bind('mouseenter mouseleave',function(event){if(event.type=='mouseenter'){if(!sticky){Gritter._restoreItemIfFading($(this),number);}}
else{if(!sticky){Gritter._setFadeTimer($(this),number);}}
Gritter._hoverState($(this),event.type);});return number;},_countRemoveWrapper:function(unique_id,e){e.remove();this['_after_close_'+unique_id](e);if($('.gritter-item-wrapper').length==0){$('#gritter-notice-wrapper').remove();}},_fade:function(e,unique_id,params,unbind_events){var params=params||{},fade=(typeof(params.fade)!='undefined')?params.fade:true;fade_out_speed=params.speed||this.fade_out_speed;this['_before_close_'+unique_id](e);if(unbind_events){e.unbind('mouseenter mouseleave');}
if(fade){e.animate({opacity:0},fade_out_speed,function(){e.animate({height:0},300,function(){Gritter._countRemoveWrapper(unique_id,e);})})}
else{this._countRemoveWrapper(unique_id,e);}},_hoverState:function(e,type){if(type=='mouseenter'){e.addClass('hover');var find_img=e.find('img');(find_img.length)?find_img.before(this._tpl_close):e.find('span').before(this._tpl_close);e.find('.gritter-close').click(function(){var unique_id=e.attr('id').split('-')[2];Gritter.removeSpecific(unique_id,{},e,true);});}
else{e.removeClass('hover');e.find('.gritter-close').remove();}},removeSpecific:function(unique_id,params,e,unbind_events){if(!e){var e=$('#gritter-item-'+unique_id);}
this._fade(e,unique_id,params||{},unbind_events);},_restoreItemIfFading:function(e,unique_id){clearTimeout(this['_int_id_'+unique_id]);e.stop().css({opacity:''});},_runSetup:function(){for(opt in $.gritter.options){this[opt]=$.gritter.options[opt];}
this._is_setup=1;},_setFadeTimer:function(e,unique_id){var timer_str=(this._custom_timer)?this._custom_timer:this.time;this['_int_id_'+unique_id]=setTimeout(function(){Gritter._fade(e,unique_id);},timer_str);},stop:function(params){var before_close=($.isFunction(params.before_close))?params.before_close:function(){};var after_close=($.isFunction(params.after_close))?params.after_close:function(){};var wrap=$('#gritter-notice-wrapper');before_close(wrap);wrap.fadeOut(function(){$(this).remove();after_close();});},_str_replace:function(search,replace,subject,count){var i=0,j=0,temp='',repl='',sl=0,fl=0,f=[].concat(search),r=[].concat(replace),s=subject,ra=r instanceof Array,sa=s instanceof Array;s=[].concat(s);if(count){this.window[count]=0;}
for(i=0,sl=s.length;i<sl;i++){if(s[i]===''){continue;}
for(j=0,fl=f.length;j<fl;j++){temp=s[i]+'';repl=ra?(r[j]!==undefined?r[j]:''):r[0];s[i]=(temp).split(f[j]).join(repl);if(count&&s[i]!==temp){this.window[count]+=(temp.length-s[i].length)/f[j].length;}}}
return sa?s:s[0];},_verifyWrapper:function(){if($('#gritter-notice-wrapper').length==0){$('body').append(this._tpl_wrap);}}}})(jQuery);

/*
 * FancyBox - jQuery Plugin
 * Simple and fancy lightbox alternative
 *
 * Examples and documentation at: http://fancybox.net
 * 
 * Copyright (c) 2008 - 2010 Janis Skarnelis
 *
 * Version: 1.3.1 (05/03/2010)
 * Requires: jQuery v1.3+
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

(function(b){var m,u,x,g,D,i,z,A,B,p=0,e={},q=[],n=0,c={},j=[],E=null,s=new Image,G=/\.(jpg|gif|png|bmp|jpeg)(.*)?$/i,S=/[^\.]\.(swf)\s*$/i,H,I=1,k,l,h=false,y=b.extend(b("<div/>")[0],{prop:0}),v=0,O=!b.support.opacity&&!window.XMLHttpRequest,J=function(){u.hide();s.onerror=s.onload=null;E&&E.abort();m.empty()},P=function(){b.fancybox('<p id="fancybox_error">The requested content cannot be loaded.<br />Please try again later.</p>',{scrolling:"no",padding:20,transitionIn:"none",transitionOut:"none"})},
K=function(){return[b(window).width(),b(window).height(),b(document).scrollLeft(),b(document).scrollTop()]},T=function(){var a=K(),d={},f=c.margin,o=c.autoScale,t=(20+f)*2,w=(20+f)*2,r=c.padding*2;if(c.width.toString().indexOf("%")>-1){d.width=a[0]*parseFloat(c.width)/100-40;o=false}else d.width=c.width+r;if(c.height.toString().indexOf("%")>-1){d.height=a[1]*parseFloat(c.height)/100-40;o=false}else d.height=c.height+r;if(o&&(d.width>a[0]-t||d.height>a[1]-w))if(e.type=="image"||e.type=="swf"){t+=r;
w+=r;o=Math.min(Math.min(a[0]-t,c.width)/c.width,Math.min(a[1]-w,c.height)/c.height);d.width=Math.round(o*(d.width-r))+r;d.height=Math.round(o*(d.height-r))+r}else{d.width=Math.min(d.width,a[0]-t);d.height=Math.min(d.height,a[1]-w)}d.top=a[3]+(a[1]-(d.height+40))*0.5;d.left=a[2]+(a[0]-(d.width+40))*0.5;if(c.autoScale===false){d.top=Math.max(a[3]+f,d.top);d.left=Math.max(a[2]+f,d.left)}return d},U=function(a){if(a&&a.length)switch(c.titlePosition){case "inside":return a;case "over":return'<span id="fancybox-title-over">'+
a+"</span>";default:return'<span id="fancybox-title-wrap"><span id="fancybox-title-left"></span><span id="fancybox-title-main">'+a+'</span><span id="fancybox-title-right"></span></span>'}return false},V=function(){var a=c.title,d=l.width-c.padding*2,f="fancybox-title-"+c.titlePosition;b("#fancybox-title").remove();v=0;if(c.titleShow!==false){a=b.isFunction(c.titleFormat)?c.titleFormat(a,j,n,c):U(a);if(!(!a||a==="")){b('<div id="fancybox-title" class="'+f+'" />').css({width:d,paddingLeft:c.padding,
paddingRight:c.padding}).html(a).appendTo("body");switch(c.titlePosition){case "inside":v=b("#fancybox-title").outerHeight(true)-c.padding;l.height+=v;break;case "over":b("#fancybox-title").css("bottom",c.padding);break;default:b("#fancybox-title").css("bottom",b("#fancybox-title").outerHeight(true)*-1);break}b("#fancybox-title").appendTo(D).hide()}}},W=function(){b(document).unbind("keydown.fb").bind("keydown.fb",function(a){if(a.keyCode==27&&c.enableEscapeButton){a.preventDefault();b.fancybox.close()}else if(a.keyCode==
37){a.preventDefault();b.fancybox.prev()}else if(a.keyCode==39){a.preventDefault();b.fancybox.next()}});if(b.fn.mousewheel){g.unbind("mousewheel.fb");j.length>1&&g.bind("mousewheel.fb",function(a,d){a.preventDefault();h||d===0||(d>0?b.fancybox.prev():b.fancybox.next())})}if(c.showNavArrows){if(c.cyclic&&j.length>1||n!==0)A.show();if(c.cyclic&&j.length>1||n!=j.length-1)B.show()}},X=function(){var a,d;if(j.length-1>n){a=j[n+1].href;if(typeof a!=="undefined"&&a.match(G)){d=new Image;d.src=a}}if(n>0){a=
j[n-1].href;if(typeof a!=="undefined"&&a.match(G)){d=new Image;d.src=a}}},L=function(){i.css("overflow",c.scrolling=="auto"?c.type=="image"||c.type=="iframe"||c.type=="swf"?"hidden":"auto":c.scrolling=="yes"?"auto":"visible");if(!b.support.opacity){i.get(0).style.removeAttribute("filter");g.get(0).style.removeAttribute("filter")}b("#fancybox-title").show();c.hideOnContentClick&&i.one("click",b.fancybox.close);c.hideOnOverlayClick&&x.one("click",b.fancybox.close);c.showCloseButton&&z.show();W();b(window).bind("resize.fb",
b.fancybox.center);c.centerOnScroll?b(window).bind("scroll.fb",b.fancybox.center):b(window).unbind("scroll.fb");b.isFunction(c.onComplete)&&c.onComplete(j,n,c);h=false;X()},M=function(a){var d=Math.round(k.width+(l.width-k.width)*a),f=Math.round(k.height+(l.height-k.height)*a),o=Math.round(k.top+(l.top-k.top)*a),t=Math.round(k.left+(l.left-k.left)*a);g.css({width:d+"px",height:f+"px",top:o+"px",left:t+"px"});d=Math.max(d-c.padding*2,0);f=Math.max(f-(c.padding*2+v*a),0);i.css({width:d+"px",height:f+
"px"});if(typeof l.opacity!=="undefined")g.css("opacity",a<0.5?0.5:a)},Y=function(a){var d=a.offset();d.top+=parseFloat(a.css("paddingTop"))||0;d.left+=parseFloat(a.css("paddingLeft"))||0;d.top+=parseFloat(a.css("border-top-width"))||0;d.left+=parseFloat(a.css("border-left-width"))||0;d.width=a.width();d.height=a.height();return d},Q=function(){var a=e.orig?b(e.orig):false,d={};if(a&&a.length){a=Y(a);d={width:a.width+c.padding*2,height:a.height+c.padding*2,top:a.top-c.padding-20,left:a.left-c.padding-
20}}else{a=K();d={width:1,height:1,top:a[3]+a[1]*0.5,left:a[2]+a[0]*0.5}}return d},N=function(){u.hide();if(g.is(":visible")&&b.isFunction(c.onCleanup))if(c.onCleanup(j,n,c)===false){b.event.trigger("fancybox-cancel");h=false;return}j=q;n=p;c=e;i.get(0).scrollTop=0;i.get(0).scrollLeft=0;if(c.overlayShow){O&&b("select:not(#fancybox-tmp select)").filter(function(){return this.style.visibility!=="hidden"}).css({visibility:"hidden"}).one("fancybox-cleanup",function(){this.style.visibility="inherit"});
x.css({"background-color":c.overlayColor,opacity:c.overlayOpacity}).unbind().show()}l=T();V();if(g.is(":visible")){b(z.add(A).add(B)).hide();var a=g.position(),d;k={top:a.top,left:a.left,width:g.width(),height:g.height()};d=k.width==l.width&&k.height==l.height;i.fadeOut(c.changeFade,function(){var f=function(){i.html(m.contents()).fadeIn(c.changeFade,L)};b.event.trigger("fancybox-change");i.empty().css("overflow","hidden");if(d){i.css({top:c.padding,left:c.padding,width:Math.max(l.width-c.padding*
2,1),height:Math.max(l.height-c.padding*2-v,1)});f()}else{i.css({top:c.padding,left:c.padding,width:Math.max(k.width-c.padding*2,1),height:Math.max(k.height-c.padding*2,1)});y.prop=0;b(y).animate({prop:1},{duration:c.changeSpeed,easing:c.easingChange,step:M,complete:f})}})}else{g.css("opacity",1);if(c.transitionIn=="elastic"){k=Q();i.css({top:c.padding,left:c.padding,width:Math.max(k.width-c.padding*2,1),height:Math.max(k.height-c.padding*2,1)}).html(m.contents());g.css(k).show();if(c.opacity)l.opacity=
0;y.prop=0;b(y).animate({prop:1},{duration:c.speedIn,easing:c.easingIn,step:M,complete:L})}else{i.css({top:c.padding,left:c.padding,width:Math.max(l.width-c.padding*2,1),height:Math.max(l.height-c.padding*2-v,1)}).html(m.contents());g.css(l).fadeIn(c.transitionIn=="none"?0:c.speedIn,L)}}},F=function(){m.width(e.width);m.height(e.height);if(e.width=="auto")e.width=m.width();if(e.height=="auto")e.height=m.height();N()},Z=function(){h=true;e.width=s.width;e.height=s.height;b("<img />").attr({id:"fancybox-img",
src:s.src,alt:e.title}).appendTo(m);N()},C=function(){J();var a=q[p],d,f,o,t,w;e=b.extend({},b.fn.fancybox.defaults,typeof b(a).data("fancybox")=="undefined"?e:b(a).data("fancybox"));o=a.title||b(a).title||e.title||"";if(a.nodeName&&!e.orig)e.orig=b(a).children("img:first").length?b(a).children("img:first"):b(a);if(o===""&&e.orig)o=e.orig.attr("alt");d=a.nodeName&&/^(?:javascript|#)/i.test(a.href)?e.href||null:e.href||a.href||null;if(e.type){f=e.type;if(!d)d=e.content}else if(e.content)f="html";else if(d)if(d.match(G))f=
"image";else if(d.match(S))f="swf";else if(b(a).hasClass("iframe"))f="iframe";else if(d.match(/#/)){a=d.substr(d.indexOf("#"));f=b(a).length>0?"inline":"ajax"}else f="ajax";else f="inline";e.type=f;e.href=d;e.title=o;if(e.autoDimensions&&e.type!=="iframe"&&e.type!=="swf"){e.width="auto";e.height="auto"}if(e.modal){e.overlayShow=true;e.hideOnOverlayClick=false;e.hideOnContentClick=false;e.enableEscapeButton=false;e.showCloseButton=false}if(b.isFunction(e.onStart))if(e.onStart(q,p,e)===false){h=false;
return}m.css("padding",20+e.padding+e.margin);b(".fancybox-inline-tmp").unbind("fancybox-cancel").bind("fancybox-change",function(){b(this).replaceWith(i.children())});switch(f){case "html":m.html(e.content);F();break;case "inline":b('<div class="fancybox-inline-tmp" />').hide().insertBefore(b(a)).bind("fancybox-cleanup",function(){b(this).replaceWith(i.children())}).bind("fancybox-cancel",function(){b(this).replaceWith(m.children())});b(a).appendTo(m);F();break;case "image":h=false;b.fancybox.showActivity();
s=new Image;s.onerror=function(){P()};s.onload=function(){s.onerror=null;s.onload=null;Z()};s.src=d;break;case "swf":t='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="'+e.width+'" height="'+e.height+'"><param name="movie" value="'+d+'"></param>';w="";b.each(e.swf,function(r,R){t+='<param name="'+r+'" value="'+R+'"></param>';w+=" "+r+'="'+R+'"'});t+='<embed src="'+d+'" type="application/x-shockwave-flash" width="'+e.width+'" height="'+e.height+'"'+w+"></embed></object>";m.html(t);
F();break;case "ajax":a=d.split("#",2);f=e.ajax.data||{};if(a.length>1){d=a[0];if(typeof f=="string")f+="&selector="+a[1];else f.selector=a[1]}h=false;b.fancybox.showActivity();E=b.ajax(b.extend(e.ajax,{url:d,data:f,error:P,success:function(r){if(E.status==200){m.html(r);F()}}}));break;case "iframe":b('<iframe id="fancybox-frame" name="fancybox-frame'+(new Date).getTime()+'" frameborder="0" hspace="0" scrolling="'+e.scrolling+'" src="'+e.href+'"></iframe>').appendTo(m);N();break}},$=function(){if(u.is(":visible")){b("div",
u).css("top",I*-40+"px");I=(I+1)%12}else clearInterval(H)},aa=function(){if(!b("#fancybox-wrap").length){b("body").append(m=b('<div id="fancybox-tmp"></div>'),u=b('<div id="fancybox-loading"><div></div></div>'),x=b('<div id="fancybox-overlay"></div>'),g=b('<div id="fancybox-wrap"></div>'));if(!b.support.opacity){g.addClass("fancybox-ie");u.addClass("fancybox-ie")}D=b('<div id="fancybox-outer"></div>').append('<div class="fancy-bg" id="fancy-bg-n"></div><div class="fancy-bg" id="fancy-bg-ne"></div><div class="fancy-bg" id="fancy-bg-e"></div><div class="fancy-bg" id="fancy-bg-se"></div><div class="fancy-bg" id="fancy-bg-s"></div><div class="fancy-bg" id="fancy-bg-sw"></div><div class="fancy-bg" id="fancy-bg-w"></div><div class="fancy-bg" id="fancy-bg-nw"></div>').appendTo(g);
D.append(i=b('<div id="fancybox-inner"></div>'),z=b('<a id="fancybox-close"></a>'),A=b('<a href="javascript:;" id="fancybox-left"><span class="fancy-ico" id="fancybox-left-ico"></span></a>'),B=b('<a href="javascript:;" id="fancybox-right"><span class="fancy-ico" id="fancybox-right-ico"></span></a>'));z.click(b.fancybox.close);u.click(b.fancybox.cancel);A.click(function(a){a.preventDefault();b.fancybox.prev()});B.click(function(a){a.preventDefault();b.fancybox.next()});if(O){x.get(0).style.setExpression("height",
"document.body.scrollHeight > document.body.offsetHeight ? document.body.scrollHeight : document.body.offsetHeight + 'px'");u.get(0).style.setExpression("top","(-20 + (document.documentElement.clientHeight ? document.documentElement.clientHeight/2 : document.body.clientHeight/2 ) + ( ignoreMe = document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop )) + 'px'");D.prepend('<iframe id="fancybox-hide-sel-frame" src="javascript:\'\';" scrolling="no" frameborder="0" ></iframe>')}}};
b.fn.fancybox=function(a){b(this).data("fancybox",b.extend({},a,b.metadata?b(this).metadata():{})).unbind("click.fb").bind("click.fb",function(d){d.preventDefault();if(!h){h=true;b(this).blur();q=[];p=0;d=b(this).attr("rel")||"";if(!d||d==""||d==="nofollow")q.push(this);else{q=b("a[rel="+d+"], area[rel="+d+"]");p=q.index(this)}C();return false}});return this};b.fancybox=function(a,d){if(!h){h=true;d=typeof d!=="undefined"?d:{};q=[];p=d.index||0;if(b.isArray(a)){for(var f=0,o=a.length;f<o;f++)if(typeof a[f]==
"object")b(a[f]).data("fancybox",b.extend({},d,a[f]));else a[f]=b({}).data("fancybox",b.extend({content:a[f]},d));q=jQuery.merge(q,a)}else{if(typeof a=="object")b(a).data("fancybox",b.extend({},d,a));else a=b({}).data("fancybox",b.extend({content:a},d));q.push(a)}if(p>q.length||p<0)p=0;C()}};b.fancybox.showActivity=function(){clearInterval(H);u.show();H=setInterval($,66)};b.fancybox.hideActivity=function(){u.hide()};b.fancybox.next=function(){return b.fancybox.pos(n+1)};b.fancybox.prev=function(){return b.fancybox.pos(n-
1)};b.fancybox.pos=function(a){if(!h){a=parseInt(a,10);if(a>-1&&j.length>a){p=a;C()}if(c.cyclic&&j.length>1&&a<0){p=j.length-1;C()}if(c.cyclic&&j.length>1&&a>=j.length){p=0;C()}}};b.fancybox.cancel=function(){if(!h){h=true;b.event.trigger("fancybox-cancel");J();e&&b.isFunction(e.onCancel)&&e.onCancel(q,p,e);h=false}};b.fancybox.close=function(){function a(){x.fadeOut("fast");g.hide();b.event.trigger("fancybox-cleanup");i.empty();b.isFunction(c.onClosed)&&c.onClosed(j,n,c);j=e=[];n=p=0;c=e={};h=false}
if(!(h||g.is(":hidden"))){h=true;if(c&&b.isFunction(c.onCleanup))if(c.onCleanup(j,n,c)===false){h=false;return}J();b(z.add(A).add(B)).hide();b("#fancybox-title").remove();g.add(i).add(x).unbind();b(window).unbind("resize.fb scroll.fb");b(document).unbind("keydown.fb");i.css("overflow","hidden");if(c.transitionOut=="elastic"){k=Q();var d=g.position();l={top:d.top,left:d.left,width:g.width(),height:g.height()};if(c.opacity)l.opacity=1;y.prop=1;b(y).animate({prop:0},{duration:c.speedOut,easing:c.easingOut,
step:M,complete:a})}else g.fadeOut(c.transitionOut=="none"?0:c.speedOut,a)}};b.fancybox.resize=function(){var a,d;if(!(h||g.is(":hidden"))){h=true;a=i.wrapInner("<div style='overflow:auto'></div>").children();d=a.height();g.css({height:d+c.padding*2+v});i.css({height:d});a.replaceWith(a.children());b.fancybox.center()}};b.fancybox.center=function(){h=true;var a=K(),d=c.margin,f={};f.top=a[3]+(a[1]-(g.height()-v+40))*0.5;f.left=a[2]+(a[0]-(g.width()+40))*0.5;f.top=Math.max(a[3]+d,f.top);f.left=Math.max(a[2]+
d,f.left);g.css(f);h=false};b.fn.fancybox.defaults={padding:10,margin:20,opacity:false,modal:false,cyclic:false,scrolling:"auto",width:560,height:340,autoScale:true,autoDimensions:true,centerOnScroll:false,ajax:{},swf:{wmode:"transparent"},hideOnOverlayClick:true,hideOnContentClick:false,overlayShow:true,overlayOpacity:0.3,overlayColor:"#666",titleShow:true,titlePosition:"outside",titleFormat:null,transitionIn:"fade",transitionOut:"fade",speedIn:300,speedOut:300,changeSpeed:300,changeFade:"fast",
easingIn:"swing",easingOut:"swing",showCloseButton:true,showNavArrows:true,enableEscapeButton:true,onStart:null,onCancel:null,onComplete:null,onCleanup:null,onClosed:null};b(document).ready(function(){aa()})})(jQuery);
