<?php

$study = rtrim($_POST['study']);
$resultID = rtrim($_POST['resultID']);
$data = $_POST['data'];

$dir = "data/" . $study;

if (!file_exists($dir)) {
	mkdir($dir);
}

$fh = fopen($dir . "/" . $resultID . ".json", 'w') or die("Error opening file!");
fwrite($fh, $data);
fclose($fh);

echo "Success";
?>
