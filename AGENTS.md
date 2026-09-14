<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes â€” APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:rigorous-testing-rule -->
# Vérification systématique obligatoire

A chaque fois qu'une requête implique de la logique métier, un algorithme ou des calculs de données (comme les classements), vous DEVEZ obligatoirement écrire et exécuter un script de vérification (via run_command) pour prouver que votre algorithme donne le bon résultat AVANT de modifier le code de l'application.
<!-- END:rigorous-testing-rule -->

