var maxNumLocalThreads = 30;

init();

if (location.href.indexOf("subback.html") != -1)
{
	onSubbackHtml();
}
else if (location.href.indexOf("read.cgi") != -1)
{
	onReadCgi();
}
else if (location.href.indexOf("bbstable.html") != -1)
{
	onBbstableHtml();
}



function ThreadItem(uri, prev, next, numComments)
{
	this.uri = uri;
	this.prev = prev;
	this.next = next;
	this.numComments = numComments;
}

function writeThreadItem(item)
{
	localStorage.setItem(item.uri, item.prev + "," + item.next + "," + item.numComments);
}

function readThreadItem(uri)
{
	var value = localStorage.getItem(uri);
	if (value != undefined)
	{
		var splitted = value.split(",");
		return new ThreadItem(uri, splitted[0], splitted[1], parseInt(splitted[2]));
	}
	else
	{
		return null;
	}
}

function removeThreadItem(uri)
{
	localStorage.removeItem(uri);
}

function init()
{
	if (localStorage.getItem("numLocalThreads") == undefined)
	{
		localStorage.clear();
		writeThreadItem(new ThreadItem("head", "head", "tail", 0));
		writeThreadItem(new ThreadItem("tail", "head", "tail", 0));
		localStorage.setItem("numLocalThreads", "0");
	}
}

function increaseNumLocalThreads()
{
	var numLocalThreads = parseInt(localStorage.getItem("numLocalThreads"));
	numLocalThreads++;
	localStorage.setItem("numLocalThreads", numLocalThreads);
}

function decreaseNumLocalThreads()
{
	var numLocalThreads = parseInt(localStorage.getItem("numLocalThreads"));
	numLocalThreads--;
	localStorage.setItem("numLocalThreads", numLocalThreads);
}

function addLocalThread(uri, numComments)
{
	var head = readThreadItem("head");
	var second = readThreadItem(head.next);
	var newItem = new ThreadItem(uri, head.uri, second.uri, numComments);
	head.next = newItem.uri;
	second.prev = newItem.uri;
	writeThreadItem(newItem);
	writeThreadItem(head);
	writeThreadItem(second);
	increaseNumLocalThreads();
}

function removeLocalThread(uri)
{
	var targetItem = readThreadItem(uri);
	var prev = readThreadItem(targetItem.prev);
	var next = readThreadItem(targetItem.next);
	prev.next = next.uri;
	next.prev = prev.uri;
	writeThreadItem(prev);
	writeThreadItem(next);
	removeThreadItem(targetItem.uri);
	decreaseNumLocalThreads();
}

function removeOldLocalThreads()
{
	while (true)
	{
		var numLocalThreads = parseInt(localStorage.getItem("numLocalThreads"));
		if (numLocalThreads > maxNumLocalThreads)
		{
			removeLocalThread(readThreadItem("tail").prev);
		}
		else
		{
			break;
		}
	}
}

function updateLocalThread(uri, numComments)
{
	var targetItem = readThreadItem(uri);
	if (targetItem == null)
	{
		addLocalThread(uri, numComments);
	}
	else
	{
		removeLocalThread(targetItem.uri);
		addLocalThread(targetItem.uri, numComments);
	}
	removeOldLocalThreads();
}

function getNumCommentsFromLocalThread(uri)
{
	var targetItem = readThreadItem(uri);
	if (targetItem == null)
	{
		return 0;
	}
	else
	{
		return targetItem.numComments;
	}
}

function getNormalizedThreadUri(uri)
{
	var splitted = uri.split("/");
	splitted.pop();
	return splitted.join("/") + "/";
}

function onSubbackHtml()
{
	subbackHtml_arrange();
}

function subbackHtml_arrange()
{
	var upper = "";
	var lower = "";
	var trad = document.getElementById("trad");
	var links = trad.getElementsByTagName("a");
	for (var i = 0; i < links.length; i++)
	{
		var title = links[i].innerHTML;
		var href = links[i].href;
		var threadUri = getNormalizedThreadUri(links[i].href);
		var threadItem = readThreadItem(threadUri);
		if (threadItem != null)
		{
			var newNumComments = parseInt(title.match(/\((\d+)\)\s*$/)[1]);
			var marker = newNumComments > threadItem.numComments ? "●" : "◎";
			var script = "removeLocalThread('" + threadUri + "');location.reload();";
			var style = "cursor:pointer;";
			var button = "<span style=\""+ style +"\" onclick=\"" + script + "\">" + marker + "</span>";
			upper += button + " <a href=\"" + href + "\">" + title + "</a><br>";
		}
		else
		{
			lower += "○ <a href=\"" + href + "\">" + title + "</a><br>";
		}
	}
	trad.innerHTML = upper + lower
		+ "<br><a href=\"javascript:localStorage.clear();location.reload();\">リセット</a>"
		+ "<br><a href=\"javascript:showDebugInfo();\">デバッグ情報</a>";;
}

function onReadCgi()
{
	var normalizedUri = getNormalizedThreadUri(location.href);
	var threadData = readCgi_getThreadData();
	var prevNumComments = getNumCommentsFromLocalThread(normalizedUri);
	var newNumComments = readCgi_getNumComments(threadData);
	readCgi_highlightNewComments(threadData, prevNumComments);
	readCgi_setThreadData(threadData);
	var firstnew = document.getElementById("firstnew");
	if (firstnew != null)
	{
		firstnew.scrollIntoView(true);
	}
	else
	{
		document.forms[0].FROM.scrollIntoView(true);
	}
	updateLocalThread(normalizedUri, newNumComments);
}

function readCgi_getThreadData()
{
	var data = document.getElementsByTagName("dl")[0];
	return data.innerHTML.split("\n");
}

function readCgi_setThreadData(data)
{
	document.getElementsByTagName("dl")[0].innerHTML = data.join("\n");
}

function readCgi_dumpThreadData(data)
{
	alert(data.join("\r\n"));
}

function readCgi_getNumComments(threadData)
{
	for (var i = threadData.length - 1; i >= 0; i--)
	{
		var match = threadData[i].match(/<dt>\s*(\d+)/);
		if (match != null)
		{
			return parseInt(match[1]);
		}
	}
	
}

function readCgi_highlightNewComments(threadData, prevNumComments)
{
	var anchored = false;
	for (var i = 0; i < threadData.length; i++)
	{
		var match = threadData[i].match(/<dt>\s*(\d+)/);
		if (match != null)
		{
			var num = parseInt(match[1]);
			if (num > prevNumComments)
			{
				if (!anchored)
				{
					threadData[i] = threadData[i].replace(/(<dt>\s*)(\d+)/, "$1<b id=\"firstnew\">$2</b>");
					anchored = true;
				}
				else
				{
					threadData[i] = threadData[i].replace(/(<dt>\s*)(\d+)/, "$1<b>$2</b>");
				}
			}
		}
	}
}

function onBbstableHtml()
{
	var html = document.body.innerHTML;
	html = html.replace(/【/g, "<br><br>【").replace(/】/g, "】<br>");
	html = html.replace(/(http:\/\/.+?2ch\.net\/.+?\/)/g, "$1subback.html");
	html = html.replace(/(http:\/\/.+?bbspink\.com\/.+?\/)/g, "$1subback.html");
	document.body.innerHTML = html;
}

function showDebugInfo()
{
	var s = "";
	{
		s += "■ローカルスレ一覧(先頭から)\r\n";
		var currItem = readThreadItem("head");
		while (true)
		{
			currItem = readThreadItem(currItem.next);
			if (currItem.uri == "tail")
			{
				break;
			}
			else
			{
				s += currItem.uri + ", " + currItem.prev + ", " + currItem.next + ", " + currItem.numComments + "\r\n";
			}
		}
	}
		{
		s += "■ローカルスレ一覧(末尾から)\r\n";
		var currItem = readThreadItem("tail");
		while (true)
		{
			currItem = readThreadItem(currItem.prev);
			if (currItem.uri == "head")
			{
				break;
			}
			else
			{
				s += currItem.uri + ", " + currItem.prev + ", " + currItem.next + ", " + currItem.numComments + "\r\n";
			}
		}
	}
	{
		s += "■ローカルストレージ\r\n";
		for (var i = 0; i < localStorage.length; i++)
		{
			var key = localStorage.key(i);
			s += key + ": " + localStorage.getItem(key) + "\r\n";
		}
	}
	alert(s);
}
