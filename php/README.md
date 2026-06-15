# adflow/sdk (PHP)

Official PHP SDK for the **AdFlow bridge** — Meta Marketing (Ads), Threads, and **free** Facebook
Pages & Instagram, through AdFlow's Meta-App-Review-approved app.

## Install
```bash
composer require adflow/sdk
```

## Quick start
```php
use AdFlow\Sdk\AdFlow;

$adflow = new AdFlow(['apiKey' => getenv('ADFLOW_API_KEY')]);

$client = $adflow->clients->create(['displayName' => 'Kedai ABC']);
echo $client['onboardUrl'];

$adflow->account('act_123')->createCampaign(['name' => 'Q3', 'objective' => 'OUTCOME_TRAFFIC', 'status' => 'PAUSED']);
$adflow->profile('17841400000000000')->publish(['mediaType' => 'TEXT', 'text' => 'Hello']);
$adflow->page('1029384')->createPost(['message' => 'Hi']);
```

## Errors
Throws `AdFlow\Sdk\AdFlowError` with `->errorCode` and `->status`.

## License
MIT
