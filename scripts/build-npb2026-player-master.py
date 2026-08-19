#!/usr/bin/env python3
"""NPB公式 2026年度選手一覧HTML → PlayerMasterImportRow JSON"""

from __future__ import annotations

import json
import re
from pathlib import Path

TEAM_META = {
    "t": {
        "teamId": "tigers",
        "slug": "hanshin",
        "teamName": "阪神タイガース",
    },
    "db": {
        "teamId": "baystars",
        "slug": "dena",
        "teamName": "横浜DeNAベイスターズ",
    },
    "g": {
        "teamId": "giants",
        "slug": "giants",
        "teamName": "読売ジャイアンツ",
    },
    "d": {
        "teamId": "dragons",
        "slug": "chunichi",
        "teamName": "中日ドラゴンズ",
    },
    "c": {
        "teamId": "carp",
        "slug": "hiroshima",
        "teamName": "広島東洋カープ",
    },
    "s": {
        "teamId": "swallows",
        "slug": "yakult",
        "teamName": "東京ヤクルトスワローズ",
    },
    "h": {
        "teamId": "hawks",
        "slug": "softbank",
        "teamName": "福岡ソフトバンクホークス",
    },
    "f": {
        "teamId": "fighters",
        "slug": "nipponham",
        "teamName": "北海道日本ハムファイターズ",
    },
    "b": {
        "teamId": "buffaloes",
        "slug": "orix",
        "teamName": "オリックス・バファローズ",
    },
    "e": {
        "teamId": "eagles",
        "slug": "rakuten",
        "teamName": "東北楽天ゴールデンイーグルス",
    },
    "l": {
        "teamId": "lions",
        "slug": "seibu",
        "teamName": "埼玉西武ライオンズ",
    },
    "m": {
        "teamId": "marines",
        "slug": "lotte",
        "teamName": "千葉ロッテマリーンズ",
    },
}

POS_MAP = {
    "投手": "投手",
    "捕手": "捕手",
    "内野手": "内野手",
    "外野手": "外野手",
}

# よくある名字（gameDisplayName）。フルネーム先頭一致で使う補助
# 取れない場合は空白区切りの先頭／全体


def game_display_name(full_name: str) -> str:
    """プロスピの名字表示を近似。スペース区切りの姓、単一名は全体。"""
    cleaned = full_name.replace("\u3000", " ").strip()
    parts = [p for p in cleaned.split(" ") if p]
    if not parts:
        return cleaned
    if len(parts) == 1:
        return parts[0]
    return parts[0]


def player_id(slug: str, npb_id: str, number: str) -> str:
    """安定ID: 球団slug + NPB選手ページID + 背番号"""
    num = re.sub(r"\D", "", number) or "x"
    return f"{slug}_{npb_id}_{num}"


def parse_team(html: str, code: str) -> list[dict]:
    meta = TEAM_META[code]
    # 支配下のみ。備考の「育成選手から支配下…」に引っかからないよう見出しで区切る
    m = re.search(
        r"■\s*支配下選手([\s\S]*?)(?:■\s*育成選手|$)",
        html,
    )
    if not m:
        raise RuntimeError(f"no roster section for {code}")
    section = m.group(1)

    position = None
    players: list[dict] = []
    # header rows set position via name="pit"|cat|inf|out or text
    for block in re.finditer(
        r'<tr class="rosterMainHead">([\s\S]*?)</tr>|<tr class="rosterPlayer">([\s\S]*?)</tr>',
        section,
    ):
        if block.group(1) is not None:
            head = block.group(1)
            if "監督" in head:
                position = None
                continue
            pos_m = re.search(
                r'name="(pit|cat|inf|out)"|>(投手|捕手|内野手|外野手)<',
                head,
            )
            if pos_m:
                token = pos_m.group(1) or pos_m.group(2)
                position = {
                    "pit": "投手",
                    "cat": "捕手",
                    "inf": "内野手",
                    "out": "外野手",
                    "投手": "投手",
                    "捕手": "捕手",
                    "内野手": "内野手",
                    "外野手": "外野手",
                }[token]
            continue

        if position is None:
            continue
        row = block.group(2)
        # only linked players (active roster entries)
        name_m = re.search(
            r'class="rosterRegister"><a href="/bis/players/(\d+)\.html">([^<]+)</a>',
            row,
        )
        if not name_m:
            continue
        num_m = re.search(r"<td>([^<]+)</td>", row)
        if not num_m:
            continue
        number_raw = num_m.group(1).strip()
        # skip ikusei-style numbers that slipped in (leading zeros length>=3)
        if re.fullmatch(r"0\d{2,}", number_raw):
            continue
        npb_id = name_m.group(1)
        full_name = (
            name_m.group(2)
            .replace("&nbsp;", " ")
            .replace("\u3000", " ")
            .strip()
        )
        full_name = re.sub(r"\s+", " ", full_name)
        full_name_display = full_name.replace(" ", "")

        try:
            uniform = int(re.sub(r"\D", "", number_raw) or "")
        except ValueError:
            uniform = None

        display = game_display_name(full_name)
        pid = player_id(meta["slug"], npb_id, number_raw)

        players.append(
            {
                "playerId": pid,
                "fullName": full_name_display,
                "gameDisplayName": display,
                "teamId": meta["teamId"],
                "teamName": meta["teamName"],
                "position": position,
                "uniformNumber": uniform,
                "isRealPlayer": True,
                "year": 2026,
            }
        )
    return players


def fetch_html(code: str, dest: Path) -> None:
    import urllib.request

    url = f"https://npb.jp/bis/teams/rst_{code}.html"
    req = urllib.request.Request(url, headers={"User-Agent": "probase-museum-roster-build/1.0"})
    with urllib.request.urlopen(req, timeout=60) as res:
        dest.write_bytes(res.read())


def main() -> None:
    cache = Path("/tmp/probase-npb-roster")
    cache.mkdir(parents=True, exist_ok=True)
    all_players: list[dict] = []
    for code in TEAM_META:
        html_path = cache / f"npb_{code}.html"
        if not html_path.exists() or html_path.stat().st_size < 1000:
            print(f"fetch {code}...")
            fetch_html(code, html_path)
        html = html_path.read_text(encoding="utf-8", errors="ignore")
        team_players = parse_team(html, code)
        print(f"{code}: {len(team_players)}")
        all_players.extend(team_players)

    # dedupe by playerId
    by_id: dict[str, dict] = {}
    for p in all_players:
        by_id[p["playerId"]] = p
    players = list(by_id.values())
    players.sort(key=lambda p: (p["teamId"], p["position"], p["uniformNumber"] or 999, p["fullName"]))

    out = Path(
        "/Users/kaiyasuhiro/Documents/GitHub/probase-museum/src/data/playerMaster/npb2026Players.json"
    )
    out.write_text(
        json.dumps({"year": 2026, "source": "https://npb.jp/bis/teams/", "players": players}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(players)} players -> {out}")


if __name__ == "__main__":
    main()
