export interface CardOption {
  uuid: string;
  name: string;
  order: number;
  imageId?: string;
  isUserUpload: boolean;
  hasBakedBleed?: boolean;
  set?: string;
  number?: string;
  lang?: string;
}

export interface ScryfallCard {
  name: string;
  imageUrls: string[];
  set?: string;
  number?: string;
  lang?: string;
}

export interface RawCardData {
    name: string;
    cmc: number;
    type_line: string;
    set: string;
    rarity: string;
    scryfall_id: string; // The unique ID for Scryfall
    uniqueCardId: string; // The unique ID for Moxfield (used in some asset URLs)
    image_seq?: number; // The image sequence number (used in Moxfield's asset URL)
    
    // Add other fields you might need later, like oracle_text, mana_cost, etc.
    [key: string]: any; // Allow for other properties not explicitly defined
}

// --- 2. Interface for the RAW object wrapping mainboard cards (contains quantity and finish) ---
export interface MainboardItem {
    quantity: number;
    finish: string;
    card: RawCardData;
    [key: string]: any;
}

// --- 3. Interface for the simplified output Card Object ---
export interface ICard {
    name: string;
    cmc: number;
    typeLine: string;
    set: string;
    rarity: string;
    isCommander: boolean;

    getScryfallImageUrl(): string;
    getMoxfieldImageUrl(): string;
}

// --- 4. Interface for the entire deck JSON structure for the factory function ---
export interface DeckData {
    main: RawCardData;
    mainboard: {
        [cardName: string]: MainboardItem;
    };
    [key: string]: any;
}


export class MagicCard implements ICard {
    // Public Properties
    public name: string;
    public cmc: number;
    public typeLine: string;
    public set: string;
    public rarity: string;
    public isCommander: boolean;

    // Private Properties to store pre-calculated URLs
    private _scryfallImageUrl: string;
    private _moxfieldImageUrl: string;
    
    // Constants for URL construction
    private static SCYRFALL_BASE_URL = 'https://cards.scryfall.io/large/front/';
    private static MOXFIELD_ASSET_BASE = 'https://assets.moxfield.net/cards/';
    
    constructor(cardData: RawCardData, isCommander: boolean = false) {
        this.name = cardData.name;
        this.cmc = cardData.cmc;
        this.typeLine = cardData.type_line;
        this.set = cardData.set;
        this.rarity = cardData.rarity;
        this.isCommander = isCommander;
        
        // 🛠️ Step 1: Pre-calculate the URLs upon object creation
        this._scryfallImageUrl = this._buildScryfallUrl(cardData.scryfall_id);
        this._moxfieldImageUrl = this._buildMoxfieldUrl(cardData.image_seq);
    }
    
    // 🛠️ Step 2: Private methods for robust URL construction
    private _buildScryfallUrl(scryfallId: string): string {
        if (!scryfallId) {
            return "Error: No Scryfall ID available for image generation.";
        }
        // Scryfall's common direct image format: [first-char]/[second-char]/[full-id].jpg
        const char1 = scryfallId.substring(0, 1);
        const char2 = scryfallId.substring(1, 2);
        
        return `${MagicCard.SCYRFALL_BASE_URL}${char1}/${char2}/${scryfallId}.jpg`;
    }
    
    private _buildMoxfieldUrl(imageSeq?: number): string {
        if (!imageSeq) {
            // Moxfield's image URLs seem to primarily rely on the image_seq property
            return "Error: No Moxfield Image Sequence ID available.";
        }
        // Moxfield image URL structure appears to be a fixed base + image_seq
        return `${MagicCard.MOXFIELD_ASSET_BASE}${imageSeq}`;
    }
    
    // 🛠️ Step 3: Public methods to access the pre-calculated image URLs
    public getScryfallImageUrl(): string {
        return this._scryfallImageUrl;
    }
    
    public getMoxfieldImageUrl(): string {
        return this._moxfieldImageUrl;
    }

    // Optional: for easy logging
    public toString(): string {
        return `${this.name} (CMC: ${this.cmc}) - Commander: ${this.isCommander}`;
    }
}
