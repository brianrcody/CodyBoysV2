<?php
// NOTE: PHP mail() requires a configured MTA on the server (e.g. Postfix or Sendmail).
// If email is not being received, check server MTA configuration
// or consider replacing with an SMTP library (e.g. PHPMailer).

include 'BKPConstants.php';

// Algorithm from http://www.linuxjournal.com/article/9585?page=0,3
function validEmail($email) {
  $isValid = true;
  $atIndex = strrpos($email, "@");
  if (is_bool($atIndex) && !$atIndex) {
    $isValid = false;
  }
  else {
    $domain = substr($email, $atIndex+1);
    $local = substr($email, 0, $atIndex);
    $localLen = strlen($local);
    $domainLen = strlen($domain);
    if ($localLen < 1 || $localLen > 64) {
      // local part length exceeded
      $isValid = false;
    }
    else if ($domainLen < 1 || $domainLen > 255) {
      // domain part length exceeded
      $isValid = false;
    }
    else if ($local[0] == '.' || $local[$localLen-1] == '.') {
      // local part starts or ends with '.'
      $isValid = false;
    }
    else if (preg_match('/\\.\\./', $local)) {
      // local part has two consecutive dots
      $isValid = false;
    }
    else if (!preg_match('/^[A-Za-z0-9\\-\\.]+$/', $domain)) {
      // character not valid in domain part
      $isValid = false;
    }
    else if (preg_match('/\\.\\./', $domain)) {
      // domain part has two consecutive dots
      $isValid = false;
    }
    else if (!preg_match('/^(\\\\.|[A-Za-z0-9!#%&`_=\\/$\'*+?^{}|~.-])+$/',
                         str_replace("\\\\","",$local))) {
      // character not valid in local part unless
      // local part is quoted
      if (!preg_match('/^"(\\\\"|[^"])+"$/',
                      str_replace("\\\\","",$local))) {
        $isValid = false;
      }
    }
    if ($isValid && !(checkdnsrr($domain,"MX") ||
                      checkdnsrr($domain,"A"))) {
      // domain not found in DNS
      $isValid = false;
    }
  }
  return $isValid;
}

$from = $_POST["from"];
if (validEmail($from)) {
  $header = "From: " . $from;
  mail(BKPConstants::SUGGESTIONS_EMAIL, "NateWeb Suggestions", $_POST["body"], $header);
  header("Location: suggestions_sent.html");
} else {
  header("Location: suggestions_notsent.html");
}

?>
