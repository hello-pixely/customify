<?php
/**
 * Load all integrations.
 *
 * @see         https://pixelgrade.com
 * @author      Pixelgrade
 * @since       2.6.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

require_once 'integrations/pixelgrade-care.php';
require_once 'integrations/pixelgrade-assistant.php';
