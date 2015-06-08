<?php

$study = rtrim($_POST['study']);
$chart = rtrim($_POST['chart']);
$subjectID = rtrim($_POST['subjectID']);
$data = $_POST['data'];

$dir = "data/" . $chart . "/" . $study;

if (!file_exists($dir)) {
	mkdir($dir);
}

$fh = fopen($dir . "/" . $subjectID . ".json", 'w') or die("Error opening file!");
fwrite($fh, $data);
fclose($fh);

echo "Success";
?>
