def parse_tokens(tokens: list) -> list:
    ast = []
    for token in tokens:
        if ":" in token:
            k, v = token.split(":", 1)
            ast.append({"type": "key_value", "key": k.strip().lower(), "value": v.strip()})
        else:
            ast.append({"type": "general_term", "value": token.strip()})
    return ast
