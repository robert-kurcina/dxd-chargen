--[[    Character Sheet Template    by: MrStump
--      DXDCRS for Sarna Len RPG
--      requires that a decal named "Star" is placed once per Character Level
--      Character Level defaults to one, but is one per Star decal
--
Begin editing below:    ]]

--Set this to true while editing and false when you have finished
disableSave = false
--Remember to set this to false once you are done making changes
--Then, after you save and apply it, save your game too

--Color information for button text (r,g,b, values of 0-1) -- default {0,0,0} and transparent if {0,0,0,255}
buttonFontColor = {0,0,0}

--Color information for button background -- default if {1,1,1} and transparent if {1,1,1,0}
buttonColor = {1,1,1}

--Change scale of button (Avoid changing if possible)
buttonScale = {0.1,0.1,0.1}

rotationNormal = {0,0,0}
rotationFlipped = {180,180,0}

-- Used for adjusting Endurance, Resilience, and Resistance
END_RES_RES_DELTA = -15

--These are Tooltip valueSIZ
TOOLTIP_ENDURANCE = "Physical Endurance. Ignore the effects of Fatigue and Weariness."
TOOLTIP_RESILIENCE = "Mental Resilience. Ignore the effects of Stress."
TOOLTIP_RESISTANCE = "Radiation Resistance. Ignore the effects of Rads."
TOOLTIP_DAMAGE = "Physical Damage. How much Hitpoints have been reduced."
TOOLTIP_INJURY = "Physical Injury. How much Bodypoints have been reduced."
TOOLTIP_FATIGUE = "Physical Fatigue. Acquire this when doing too much too quickly."
TOOLTIP_WEARINESS = "Physical Weariness. Acquire this when doing too much for too long."
TOOLTIP_STRESS = "Mental Stress. Acquire this when the mental, psychological, or emotional health of the character is attacked."
TOOLTIP_RADS = "Radiation Damage. The Wasting Sickness. Acquire this around too much magic."

-- used for Hitpoints and Favor dice
textInputHash = {}
checkboxInputHash = {}
updateTriggerText = {}
updateTriggerText["CCA"] = true
updateTriggerText["RCA"] = true
updateTriggerText["REF"] = true
updateTriggerText["INT"] = true
updateTriggerText["KNO"] = true
updateTriggerText["PRE"] = true
updateTriggerText["POW"] = true
updateTriggerText["STR"] = true
updateTriggerText["FOR"] = true
updateTriggerText["SIZ"] = true
updateTriggerText["ZED"] = true

updateTriggerText["CharacterLevel"] = true
updateTriggerText["Stature"] = true
updateTriggerText["Build"] = true
updateTriggerText["Profile"] = true

updateTriggerText["Hitpoints"] = true
updateTriggerText["Bodypoints"] = true
updateTriggerText["Recovery"] = true
updateTriggerText["Endurance"] = true
updateTriggerText["Resilience"] = true
updateTriggerText["Resistance"] = true

updateTriggerText["Damage"] = true
updateTriggerText["Injury"] = true
updateTriggerText["Fatigue"] = true
updateTriggerText["Weariness"] = true
updateTriggerText["Stress"] = true
updateTriggerText["Rads"] = true

saveAttrNames = {}
saveAttrNames["Name"] = true
saveAttrNames["CCA"] = true
saveAttrNames["RCA"] = true
saveAttrNames["REF"] = true
saveAttrNames["INT"] = true
saveAttrNames["KNO"] = true
saveAttrNames["PRE"] = true
saveAttrNames["POW"] = true
saveAttrNames["STR"] = true
saveAttrNames["FOR"] = true
saveAttrNames["SIZ"] = true
saveAttrNames["ZED"] = true

saveAttrNames["CharacterLevel"] = true
saveAttrNames["Stature"] = true
saveAttrNames["Build"] = true
saveAttrNames["Profile"] = true

saveAttrNames["Hitpoints"] = true
saveAttrNames["Bodypoints"] = true
saveAttrNames["Recovery"] = true
saveAttrNames["Endurance"] = true
saveAttrNames["Resilience"] = true
saveAttrNames["Resistance"] = true

saveAttrNames["Damage"] = true
saveAttrNames["Injury"] = true
saveAttrNames["Fatigue"] = true
saveAttrNames["Weariness"] = true
saveAttrNames["Stress"] = true
saveAttrNames["Rads"] = true

saveAttrNames["WealthRank"] = true
saveAttrNames["SocialRank"] = true
saveAttrNames["ProfessionRank"] = true
saveAttrNames["FavorDice"] = true
saveAttrNames["Cellburn"] = true
saveAttrNames["Manapool"] = true

saveAttrNames["Details"] = true
saveAttrNames["HistoryNotes"] = true
saveAttrNames["Profession"] = true
saveAttrNames["Settlement"] = true
saveAttrNames["Religion"] = true
saveAttrNames["Personality"] = true
saveAttrNames["Features"] = true
saveAttrNames["GMNotes"] = true
saveAttrNames["BackName"] = true
saveAttrNames["WeaponsArmorEquipment"] = true
saveAttrNames["WeaponsArmorEquipmentProperties"] = true
saveAttrNames["BackNotes"] = true

scalar_uc = {}
scalar_uc[0] = 1.0
scalar_uc[1] = 1.2
scalar_uc[2] = 1.5
scalar_uc[3] = 2.0
scalar_uc[4] = 2.5
scalar_uc[5] = 3.0
scalar_uc[6] = 4.0
scalar_uc[7] = 5.0
scalar_uc[8] = 6.0
scalar_uc[9] = 8.0

scalar_af = {}
scalar_af[-3] = 0.01
scalar_af[-2] = 0.1
scalar_af[-1] = 1
scalar_af[0]  = 10
scalar_af[1]  = 100
scalar_af[2]  = 1000
scalar_af[3]  = 10
scalar_af[4]  = 100
scalar_af[5]  = 1
scalar_af[6]  = 10
scalar_af[7]  = 100
scalar_af[8]  = 1
scalar_af[9]  = 10

scalar_es = {}
scalar_es[-3] = ''
scalar_es[-2] = ''
scalar_es[-1] = ''
scalar_es[0]  = ''
scalar_es[1]  = ''
scalar_es[2]  = ''
scalar_es[3]  = 'K'
scalar_es[4]  = 'K'
scalar_es[5]  = 'M'
scalar_es[6]  = 'M'
scalar_es[7]  = 'M'
scalar_es[8]  = 'M'
scalar_es[9]  = 'G'

--This is the button placement information
defaultButtonData = {
    --Add checkboxes
    checkbox = {
        --[[
        attr  = the name of the attribute used for checkboxInputHash{}
        pos   = the position (pasted from the helper tool)
        size  = height/width/font_size for checkbox
        state = default starting value for checkbox (true = checked, false = not)
        font_color = color of font
        color = color of background
        charTrue = the unicode character to show when checked, defaults to 10008 which is "X".
        ]]
      --toggleCircle to locate bound object
      {
        -- funcName  = "toggleCircle",
        -- pos       = {-1.00, 0.2,-1.00},
        -- size      = 500,
        -- state     = true,
        -- charTrue  = 10008
      },
        --End of checkboxes
    },
    --Add counters that have a + and - button
    counter = {
        --[[
        attr   = the name of the attribute used for the counterInputHash{}
        pos    = the position (pasted from the helper tool)
        size   = height/width/font_size for counter
        value  = default starting value for counter
        hideBG = if background of counter is hidden (true=hidden, false=not)
        ]]

        --End of counters
    },
    --Add editable text boxes
    textbox = {
        --[[
        attr      = the name of the attribute used for textInputHash{}
        pos       = the position (pasted from the helper tool)
        rows      = how many lines of text you want for this box
        width     = how wide the text box is
        font_size = size of text. This and "rows" effect overall height
        font_color= rgba { 0,0,0, 1 }
        color     = rgba { 1,1,1, 1}
        label     = what is shown when there is no text. "" = nothing
        value     = text entered into box. "" = nothing
        validation= 1=None, 2=Integer, 3=Float, 4=Alphanumeric, 5=Username, 6=name
        tooltip   = hover text
        alignment = Number to indicate how you want text aligned
                    (1=Automatic, 2=Left, 3=Center, 4=Right, 5=Justified)
        ]]
        --BACK
        {
            attr      = "BackName",
            pos       = {0.065, -0.01, -0.925},
            rows      = 2.1,
            width     = 8000,
            font_size = 400,
            label     = ".",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped
        },
        {
            attr      = "WeaponsArmorEquipment",
            pos       = {0.515, -0.01, -0.435},
            rows      = 27.1,
            width     = 3150,
            font_size = 250,
            label     = "Dagger, Standard\n\n\nLeather Armor",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "List of Weapons, Armor, and Equipment"
        },
        {
            attr      = "WeaponsArmorEquipmentProperties",
            pos       = {-0.015, -0.01, -0.435},
            rows      = 27.1,
            width     = 7000,
            font_size = 250,
            label     = "ORa -7  Acc +0  Impact +3  Damage 1D+1\n[1H, Stub]. Throwable. Swift. \n\n10#  AR 3  Deflect +0\n[Flex]. Sturdy.",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "Modifications to each Customized Spell"
        },
        {
            attr      = "BackNotes",
            pos       = {0.150, -0.01, 0.345},
            rows      = 25.1,
            width     = 10000,
            font_size = 250,
            label     = "...",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "Any additional notes go here."
        },
        {
            attr      = "IndexLift",
            pos       = {0.645, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Index of the amount of Weight which can be comfortably dragged or pushed. Each Index above this is +1 Fatigue per minute."
        },
        {
            attr      = "IndexShoulder",
            pos       = {0.560, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Index of the amount of Weight which can be comfortably carried over the shoulders. Each Index above this is +1 Fatigue per minute."
        },
        {
            attr      = "IndexCarry",
            pos       = {0.475, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Index of the amount of Weight which can be comfortably carried in two arms. Each Index above this is +1 Fatigue per minute."
        },
        {
            attr      = "IndexWalk",
            pos       = {0.365, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Walk Index. +1 Fatigue per 10-Minutes. If RED, anything after this requires +1 Fatigue per Index higher."
        },
        {
            attr      = "IndexJog",
            pos       = {0.279, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Jog Index. +1 Fatigue per 1-Minute. If RED, anything after this requires +1 Fatigue per Index higher."
        },
        {
            attr      = "IndexRun",
            pos       = {0.194, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Run Index. +1 Fatigue per 10-Seconds. If RED, it means the character can enter Sprint mode at +1 Fatigue per 10-Seconds."
        },
        {
            attr      = "IndexLob",
            pos       = {-0.087, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Any Weight Index smaller uses this value."
        },
        {
            attr      = "IndexPitch",
            pos       = {-0.002, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Any Weight Index smaller uses this value."
        },
        {
            attr      = "IndexHurl",
            pos       = {0.083, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Use this Weight Index or no smaller than this -6."
        },
        {
            attr      = "IndexUp",
            pos       = {-0.199, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Upward Jump Index."
        },
        {
            attr      = "IndexBroad",
            pos       = {-0.284, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Broad Jump Index."
        },
        {
            attr      = "IndexDown",
            pos       = {-0.369, -0.01, 0.839},
            rows      = 1.6,
            width     = 580,
            font_size = 300,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Downward Jump INdex."
        },
        {
            attr      = "ScalarLift",
            pos       = {0.645, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "How much can be comfortably dragged behind the character."
        },
        {
            attr      = "ScalarShoulder",
            pos       = {0.560, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "How much can be comfortably carried on the shoulder. Double if using both shoulders."
        },
        {
            attr      = "ScalarCarry",
            pos       = {0.475, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "How much can be comfortably carried in both arms. Use half if using a single arm."
        },
        {
            attr      = "ScalarWalk",
            pos       = {0.365, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "Walk. Feet per 10-second Turn."
        },
        {
            attr      = "ScalarJog",
            pos       = {0.279, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "Jog. Feet per 10-second Turn."
        },
        {
            attr      = "ScalarRun",
            pos       = {0.194, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "Run. Feet per 10-second Turn."
        },
        {
            attr      = "ScalarLob",
            pos       = {-0.087, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "Weight of Lob. Use this to throw small objects with a high arc accurately for a relative short distance. OR is x0.1. DM +3 and +0 ORa."
        },
        {
            attr      = "ScalarPitch",
            pos       = {-0.002, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "Weight of Pitch. Use for straightest possible throw. DM +0 and +3 ORa."
        },
        {
            attr      = "ScalarHurl",
            pos       = {0.083, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "Weight of Hurl. Involves the entire body to throw the most weight possible. DM +0 and -6 ORa."
        },
        {
            attr      = "ScalarUp",
            pos       = {-0.199, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "How heigh this character can jump, in feet. Add half of height to grab things using one or both free hands above the character's head."
        },
        {
            attr      = "ScalarBroad",
            pos       = {-0.284, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "How far this character can jump from a standing position, in feet. If running, add the distance moved divided by 4 to the total."
        },
        {
            attr      = "ScalarDown",
            pos       = {-0.369, -0.01, 0.902},
            rows      = 1.9,
            width     = 580,
            font_size = 250,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "How far this character can safely jump down, in feet when Attentive. After this they are subject to the Free Falling rules."
        },
        {
            attr      = "IndexUC",
            pos       = {-0.485, -0.01,0.850},
            rows      = 1.1,
            width     = 900,
            font_size = 600,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 2,
            tooltip   = "Enter an Index value here and see the other field for the scalar value equivalent."
        },
        {
            attr      = "ScalarUC",
            pos       = {-0.640, -0.01,0.850},
            rows      = 1.1,
            width     = 1500,
            font_size = 600,
            label     = "10",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            tooltip   = "The scalar value of something given an Index value in the filed at the left."
        },
        {
          attr      = "ScalarAgility",
          pos       = {0.365, -0.01, 0.952},
          rows      = 1.1,
          width     = 600,
          font_size = 300,
          label     = "10",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          rotation  = rotationFlipped,
          validation= 2,
          tooltip   = "How many Feet across the character can traverse during movement.",
          font_color = {0,0,0,255},
          color = {1,1,1,0}
        },
        {
          attr      = "ScalarMphRun",
          pos       = {0.194, -0.01, 0.952},
          rows      = 1.1,
          width     = 600,
          font_size = 300,
          label     = "10",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          rotation  = rotationFlipped,
          validation= 2,
          tooltip   = "How fast the character can generally run.",
          font_color = {0,0,0,255},
          color = {1,1,1,0}
        },
        {
          attr      = "Profile",
          pos       = {-0.480, -0.01, 0.947},
          rows      = 1.1,
          width     = 600,
          font_size = 300,
          label     = "50",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          rotation  = rotationFlipped,
          validation= 3,
          tooltip   = "The Profile of the character. \nAverage of Stature and Build. DM +1 per 10 difference in Close Combat."
        },
        {
            attr      = "Stature",
            pos       = {-0.587, -0.01, 0.947},
            rows      = 1.1,
            width     = 750,
            font_size = 300,
            label     = "50",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            rotation  = rotationFlipped,
            validation= 3,
            tooltip   = "The Stature of the character.\nDetermines MOV and used in Combat, and Height."
        },
        {
          attr      = "Build",
          pos       = {-0.694, -0.01, 0.947},
          rows      = 1.1,
          width     = 750,
          font_size = 300,
          label     = "50",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          rotation  = rotationFlipped,
          validation= 2,
          tooltip   = "The Build of the character.\nDetermines SIZ and Weight."
      },

        --FRONT
        {
            attr      = "Name",
            pos       = {-0.300, 0.2,-0.85},
            rows      = 2.1,
            width     = 7000,
            font_size = 400,
            label     = "Common Name\nProper Name",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            tooltip   = "The Common Name\nProper Name of the character and maybe a Family Name."
        },
        {
            attr      = "Details",
            pos       = {-0.300, 0.2,-0.65},
            rows      = 5.1,
            width     = 7000,
            font_size = 400,
            label     = "Environ > Society > Culture\n\nSpecies > Heritage\nSex > AgeGroup age YY.mm\nHeight and Weight",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            tooltip   = "Be sure to include all of;\n\nEnviron > Society > Culture\n\nSpecies > Heritage\nSex > AgeGroup age YY.mm\nHeight and Weight"
        },
        {
            attr      = "CharacterLevel",
            pos       = {-0.300, 0.2,-0.51},
            rows      = 1.1,
            width     = 7000,
            font_size = 250,
            label     = "",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            color     = {0,0,0,0},
            font_color= {0,0,0,0},
            tooltip   = "Character level and PML. Each Star decal is +1 Character level."
        },
        {
            attr      = "AttributeNotes",
            pos       = {-0.300, 0.2,-0.35},
            rows      = 1.1,
            width     = 7000,
            font_size = 250,
            label     = "",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            color     = {0,0,0,0},
            font_color= {0,0,0,0},
            tooltip   = "For all Attributes\n\n -8 Very Bad\n -5 Bad\n -2 Limited\n  1 Poor\n  4 Inferior\n  7 Average for NPC Human Adults\n10 Average for Player-characters\n13 Superior\n16 Outstanding\n19 Peak Human Ability\n22 Amazing"
        },
        {
            attr      = "HistoryNotes",
            pos       = {0.25, 0.2,0.250},
            rows      = 19.1,
            width     = 9000,
            font_size = 250,
            label     = "Allies:\n\nTragedy:\n\nSkills:\n\nSpells:\n\nEquipment:\nArmor:\nWeapons:\n\nMagic Items:\n\nLanguages:\n\nOrganization:\n\nNOTES:",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            tooltip   = "Be sure to include all of;\n\nAllies:\nTragedy:\nSkills:\nSpells:\nEquipment:\nArmor:\nWeapons:\nMagic Items:\nLanguages:\nOrganization:\nNOTES:"
        },
        {
            attr      = "Profession",
            pos       = {-0.450, 0.2, 0.05},
            rows      = 2.1,
            width     = 4000,
            font_size = 250,
            label     = "Profession > Specialization\nRank > Title",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            tooltip   = "Be sure to include all of;\n\nProfession > Specialization\nRank > Title"
        },
        {
            attr      = "Settlement",
            pos       = {-0.450, 0.2, 0.15},
            rows      = 2.1,
            width     = 4000,
            font_size = 250,
            label     = "Region\nSettlement",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            tooltip   = "Be sure to include all of;\n\nRegion\nSettlement"
        },
        {
            attr      = "Religion",
            pos       = {-0.450, 0.2, 0.25},
            rows      = 2.1,
            width     = 4000,
            font_size = 250,
            label     = "Deity\nDomains List",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            tooltip   = "The Deity which is worshipped and its Domains List. Characters are allowed to be Agnostic or even Atheist."
        },
        {
            attr      = "Personality",
            pos       = {-0.450, 0.2, 0.35},
            rows      = 2.1,
            width     = 4000,
            font_size = 250,
            label     = "Descriptors\nBlemishes",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            tooltip   = "Personality are Descriptors\nBlemishes role-playing ideas to help players stay in-character."
        },
        {
            attr      = "Features",
            pos       = {-0.450, 0.2, 0.460},
            rows      = 3.1,
            width     = 4000,
            font_size = 250,
            label     = "Features\nDisabilities",
            value     = "",
            alignment = 2,
            scale     = {0.05, 0.05, 0.05},
            tooltip   = "Features are Features\nDisabilities role-playing ideas with game-affecting mechanics to help players stay in-character."
        },
        {
            attr      = "GMNotes",
            pos       = {0.600, 0.2, 0.895},
            rows      = 4.1,
            width     = 2100,
            font_size = 250,
            label     = "Money\nXP",
            value     = "",
            alignment = 2,
            color     = {0.1,0.1,0.1},
            font_color= {1.0,0.5,0.5},
            scale     = {0.05, 0.05, 0.05},
            tooltip   = "Track Money\nXP here."
        },
        {
            attr      = "Hitpoints",
            pos       = {-0.635, 0.2,0.583},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "1",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = "Hitpoints. Combination of speed, strength, toughness. Reduce this with Damage. Lose too much of this is to fall unconscious."
        },
        {
            attr      = "Bodypoints",
            pos       = {-0.635, 0.2,0.648},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "",
            value     = "1",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = "Bodypoints. Reduce this with Damage if Hitpoints can't be used. Lose too much of this is death."
        },
        {
            attr      = "Recovery",
            pos       = {-0.635, 0.2,0.715},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "1",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = "Hitpoints Recovery. Using a Rest action in combat will recover this many Hitpoints."
        },
        {
            attr      = "Endurance",
            pos       = {-0.635, 0.2,0.782},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "1",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = TOOLTIP_ENDURANCE
        },
        {
            attr      = "Resilience",
            pos       = {-0.635, 0.2,0.848},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "1",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = TOOLTIP_RESILIENCE
        },
        {
            attr      = "Resistance",
            pos       = {-0.635, 0.2,0.917},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "1",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = TOOLTIP_RESISTANCE
        },
        {
            attr      = "Damage",
            pos       = {-0.333, 0.2,0.583},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = TOOLTIP_DAMAGE
        },
        {
            attr      = "Injury",
            pos       = {-0.333, 0.2,0.648},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = TOOLTIP_INJURY
        },
        {
            attr      = "Fatigue",
            pos       = {-0.333, 0.2,0.715},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = TOOLTIP_FATIGUE
        },
        {
            attr      = "Weariness",
            pos       = {-0.333, 0.2,0.782},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = TOOLTIP_WEARINESS
        },
        {
            attr      = "Stress",
            pos       = {-0.333, 0.2,0.848},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = TOOLTIP_STRESS
        },
        {
            attr      = "Rads",
            pos       = {-0.333, 0.2,0.917},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = TOOLTIP_RADS
        },
        {
            attr      = "WealthRank",
            pos       = {-0.068, 0.2,0.583},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = "Wealth. Make Unopposed Wealth Test to have something wanted or needed already. \n\n  0 Dirt Poor\n  3 Poor\n  6 Average\n  9 Wealthy\n12 Rich\n15 Very Rich\n18 Wealthy\n21 Obscenely Wealthy"
        },
        {
            attr      = "SocialRank",
            pos       = {-0.068, 0.2,0.648},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = "Rank in Society. Make Unopposed Social Test to pull a favor which is owed. \n\n  0 Commoner\n  1 Official\n  2 High Commoner\n  3 Landed\n  4 Aristocrat\n  5 Lesser Noble\n  6 Noble\n  7 Lesser Royale\n  8 Royale\n  9 Monarch\n10 Autarch"
        },
        {
            attr      = "ProfessionRank",
            pos       = {-0.068, 0.2,0.715},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = "Professional Rank. Advance in power and influence within the guild or organization. \n\n  0 Candidate\n  2 Veteran\n  5 Official\n  8 Master\n11 Guild Master"
        },
        {
            attr      = "FavorDice",
            pos       = {-0.068, 0.2,0.782},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "1",
            value     = "1",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = "Divine Favor. Acquire these at the start of each game session to spend on Tests for extra dice."
        },
        {
            attr      = "Cellburn",
            pos       = {-0.068, 0.2,0.848},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = "Cellburn Limit. Increase how much can be physically tolerated when casting magic."
        },
        {
            attr      = "Manapool",
            pos       = {-0.068, 0.2,0.917},
            rows      = 1.2,
            width     = 680,
            font_size = 400,
            label     = "0",
            value     = "",
            alignment = 3,
            scale     = {0.05, 0.05, 0.05},
            validation= 2,
            tooltip   = "Manapool. Spend these points to speed up magic, make it more powerful, make it safer, etc."
        },
        {
          attr      = "HastyActions",
          pos       = {0.230, 0.2,0.583},
          rows      = 1.2,
          width     = 680,
          font_size = 400,
          label     = "0",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Additional Actions.\nFor each +1 Action, must penalize REF and related Attribute with DM -3 until the next Initiative ."
      },
      {
          attr      = "MeleeAttack",
          pos       = {0.230, 0.2,0.648},
          rows      = 1.2,
          width     = 680,
          font_size = 400,
          label     = "0",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Close Combat Attacker DM.\nUses CCA DM plus Expert <weapon>, and weapon traits."
      },
      {
          attr      = "MeleeDefend",
          pos       = {0.230, 0.2,0.715},
          rows      = 1.2,
          width     = 680,
          font_size = 400,
          label     = "0",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Close Combat Defender DM.\nUses CCA DM plus Expert <weapon>, plus weapon and armor traits."
      },
      {
          attr      = "RangeAttack",
          pos       = {0.230, 0.2,0.782},
          rows      = 1.2,
          width     = 680,
          font_size = 400,
          label     = "0",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Range Combat Attacker DM.\nUses RCA DM plus Expert <weapon>, and weapon traits."
      },
      {
          attr      = "RangeDefend",
          pos       = {0.230, 0.2,0.848},
          rows      = 1.2,
          width     = 680,
          font_size = 400,
          label     = "0",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Range Combat Defender DM.\nUses REF DM plus armor traits."
      },
      {
        attr      = "MaxAdvantage",
        pos       = {0.230, 0.2,0.917},
        rows      = 1.2,
        width     = 680,
        font_size = 400,
        label     = "0",
        value     = "",
        alignment = 3,
        scale     = {0.05, 0.05, 0.05},
        tooltip   = "Limit on additional Base dice and number of Bonus dice after flattening for all Tests but Damage Test."
    },
      {
          attr      = "CCA",
          pos       = {-0.610, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Close Combat Ability. Hit Test."
      },
      {
          attr      = "RCA",
          pos       = {-0.495, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Range Combat Ability. Hit Test."
      },
      {
          attr      = "REF",
          pos       = {-0.382, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Reflexes. Detect Tests and Defender Hit Tests."
      },
      {
          attr      = "INT",
          pos       = {-0.267, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Intellect. Learning new things."
      },
      {
          attr      = "KNO",
          pos       = {-0.150, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Knowledge. Knowing things."
      },
      {
          attr      = "PRE",
          pos       = {-0.035, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Presence. Command, Beauty, Grace, and Charm."
      },
      {
          attr      = "POW",
          pos       = {0.075, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Willpower. Resist effects of mental, psychological, and emotional attacks."
      },
      {
          attr      = "STR",
          pos       = {0.190, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Strength. Raw muscularity. Attacker Damage Test."
      },
      {
          attr      = "FOR",
          pos       = {0.305, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Fortitude. Health and ability to ignore to damage. Defender Damage Test."
      },
      {
          attr      = "MOV",
          pos       = {0.420, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Movement rate for Running."
      },
      {
          attr      = "SIZ",
          pos       = {0.533, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Size. Physical size index. Heavy characters usually can take more physical damage."
      },
      {
          attr      = "ZED",
          pos       = {0.645, 0.2,-0.21},
          rows      = 1.1,
          width     = 1000,
          font_size = 800,
          label     = "7",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          validation= 2,
          tooltip   = "Zero-th factor. Affects the range of magic abilities. Start with this much mana to spend."
      },
      {
          attr      = "CCADM",
          pos       = {-0.610, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Close Combat Ability DM. Add to Close Combat Hit Test."
      },
      {
          attr      = "RCADM",
          pos       = {-0.495, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Range Combat Ability DM. Add to Attacker Range Combat Hit Test."
      },
      {
          attr      = "REFDM",
          pos       = {-0.382, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Reflexes DM. Add to Defender Range Combat Hit Test and Defender Detect Test."
      },
      {
          attr      = "INTDM",
          pos       = {-0.267, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Intellect DM. Add to Initiative Test and tests involving intelligence or guessing."
      },
      {
          attr      = "KNODM",
          pos       = {-0.150, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Knowledge DM. Add to Knowledge Test and tests involving education or learning."
      },
      {
          attr      = "PREDM",
          pos       = {-0.035, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Presence DM. Add to Rally Test and tests involving persuasion or convincing others."
      },
      {
          attr      = "POWDM",
          pos       = {0.075, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Willpower DM. Add to Morale Test and tests involving courage or bravery for self."
      },
      {
          attr      = "STRDM",
          pos       = {0.190, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Strength DM. Add to Attacker Close Combat Damage Test and anything involving using muscles."
      },
      {
          attr      = "FORDM",
          pos       = {0.305, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Fortitude DM. Add to Fortitude Test and anything involving health and resistance to disease."
      },
      {
          attr      = "MOVDM",
          pos       = {0.420, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Move DM. Add to Move Test and anything involving dodging or balance."
      },
      {
          attr      = "SIZDM",
          pos       = {0.533, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Size DM. Add to Size Test and anything involving physical size."
      },
      {
          attr      = "ZEDDM",
          pos       = {0.645, 0.2,-0.13},
          rows      = 1.1,
          width     = 1000,
          font_size = 400,
          label     = "+",
          value     = "",
          alignment = 3,
          scale     = {0.05, 0.05, 0.05},
          tooltip   = "Zed DM. Add to Effect and Damage using Magic or Magic items."
      },
      --End of textboxes
    }
}



--Lua beyond this point, I recommend doing something more fun with your life

function extractSalient(sourceData)
  -- ref_buttonData.checkbox[i].state
  -- ref_buttonData.counter[i].value
  -- ref_buttonData.textbox[i].value
  -- REQUIRES that each field be given a unique attr value
  if sourceData == nil then return end

  local saveField = {}
  saveField["checkbox"]= {}
  saveField["counter"] = {}
  saveField["textbox"] = {}

  for i, v in ipairs(sourceData.checkbox) do
    local attr = v.attr
    local state = v.state

    if saveAttrNames[attr] == true then saveField["checkbox"][attr] = state end
  end

  for i, v in ipairs(sourceData.counter) do
    local attr = v.attr
    local val = v.value

    if saveAttrNames[attr] == true then saveField["counter"][attr] = val end
  end

  for i, v in ipairs(sourceData.textbox) do
    local attr = v.attr
    local val = v.value

    if saveAttrNames[attr] == true then saveField["textbox"][attr] = val end
  end

  return saveField
end

function updateSalient(patchData, sourceData)
  local patchCheckboxes = patchData["checkbox"] or {{}}
  for i, v in ipairs(sourceData.checkbox) do
    local attr = v.attr
    local val = v.value

    local patchVal = patchCheckboxes[attr] or ""

    if saveAttrNames[attr] == true then
      sourceData["checkbox"][i].state = patchVal
    end
  end

  local patchCounters = patchData["counter"] or {{}}
  for i, v in ipairs(sourceData.counter) do
    local attr = v.attr
    local val = v.value

    local patchVal = patchCounters[attr] or ""

    if saveAttrNames[attr] == true then
      sourceData["counter"][i].value = patchVal
    end
  end

  local patchTextboxes = patchData["textbox"] or {{}}
  for i, v in ipairs(sourceData.textbox) do
    local attr = v.attr
    local val = v.value

    local patchVal = patchTextboxes[attr] or ""

    if saveAttrNames[attr] == true then
      sourceData["textbox"][i].value = patchVal
    end
  end
end

function print_r(arr, indentLevel)
    local str = ""
    local indentStr = "#"
    local prefixText = prefixStr or ''

    if(indentLevel == nil) then
        print(print_r(arr, 0))
        return
    end

    for i = 0, indentLevel do
        indentStr = indentStr.."\t"
    end

    for index,value in pairs(arr) do
        if type(value) == "table" then
            str = str..indentStr..index..": \n"..print_r(value, (indentLevel + 1))
        else
            str = str..indentStr..index..": "..value.."\n"
        end
    end
    return str
end


--Save function
function updateSave()
  local salient_data = extractSalient(ref_buttonData)
  saved_data = JSON.encode(salient_data)

  if disableSave == true then saved_data="" end
  self.script_state = saved_data
end

--Startup procedure
function onLoad(saved_data)
  ref_buttonData = defaultButtonData

  if disableSave == true then saved_data = "" end
  if saved_data ~= "" then
    local loaded_data = JSON.decode(saved_data)
    updateSalient(loaded_data, ref_buttonData)
  end

  spawnedButtonCount = 0
  createCheckbox()
  createCounter()
  createTextbox()

  updateCalculations()
end



--Click functions for buttons
function click_counter(tableIndex, buttonIndex, amount, attr)
    ref_buttonData.counter[tableIndex].value = ref_buttonData.counter[tableIndex].value + amount
    self.editButton({index = buttonIndex, label = ref_buttonData.counter[tableIndex].value})

    updateSave()
end


--Checks or unchecks the given box
function click_checkbox(tableIndex, buttonIndex, attr)
    if ref_buttonData.checkbox[tableIndex].state == true then
        ref_buttonData.checkbox[tableIndex].state = false
        self.editButton({index=buttonIndex, label = ""})
    else
        ref_buttonData.checkbox[tableIndex].state = true
        self.editButton({index=buttonIndex, label = string.char(10008)})
    end

    updateSave()
end

--Updates saved value for given text box
function click_textbox(i, value, selected, attr)
  if selected == false then
      ref_buttonData.textbox[i].value = value
      updateAttrDM(attr)

      if updateTriggerText[attr] == true then updateOtherStats() end
      if saveAttrNames[attr] == true then updateSave() end
  end

  if attr ~= "IndexUC" then return end
  setUCValue()
end

function updateCalculations()
  updateAttrDM("CCA")
  updateAttrDM("RCA")
  updateAttrDM("REF")
  updateAttrDM("INT")

  updateAttrDM("KNO")
  updateAttrDM("PRE")
  updateAttrDM("POW")
  updateAttrDM("STR")

  updateAttrDM("FOR")
  updateAttrDM("MOV")
  updateAttrDM("SIZ")
  updateAttrDM("ZED")

  updateOtherStats()
end

function getStarCount()
  local decals = self.getDecals()
  local starCount = 0

  if decals == nil then return end

  for i, value in pairs(decals) do
    if value.name:lower() == 'star' then starCount = starCount + 1 end
  end

  starCount = math.max(1, starCount)
  return starCount
end

function updateCharacterLevel()
  local starCount = getStarCount()
  local toolTipCharacterLevel = "Character Level is " .. starCount

  local inputIndex = textInputHash["CharacterLevel"]
  self.editInput({index=inputIndex-1, tooltip=toolTipCharacterLevel, value=starCount, label=toolTipCharacterLevel})
end

function updateOtherStats()
  updateCharacterLevel()
  updateSIZ()
  updateCarryAbility()
  updateThrowingAbility()
  updateMovementAbility()
  updateJumpingAbility()

  updateHitpoints()
  updateBodypoints()
  updateRecovery()
  updateEndurance()
  updateResilience()
  updateResistance()

  updateDamage()
  updateInjury()
  updateFatigue()
  updateWeariness()
  updateStress()
  updateRads()

  updateFavorDice()
  updateCellburn()
  updateManapool()
  updateBackName()
  updateProfileRank()

  updateHastyActions()
  updateMeleeAttack()
  updateMeleeDefend()
  updateRangeAttack()
  updateRangeDefend()
  updateMaxAdvantage()
end

function getScalarValue(givenIndex)
  if givenIndex < -30 then givenIndex = -30 end
  if givenIndex > 90 then givenIndex = 90 end

  local magnitude = math.floor(givenIndex/10)
  local remainder = givenIndex - 10 * magnitude
  local scalarValue = scalar_uc[remainder] * scalar_af[magnitude] .. scalar_es[magnitude]

  return scalarValue
end

function getIndex(value)
  if value == nil or value == "" or value == 0 then return 0 end
  if value < 0.1 then return -20 end
  if value < 1 then return -10 end
  if value >= 100000 then return 40 end

  local processValue = value
  local dekaGroup = 0
  local dekaOffset = 0

  if value >= 1 then dekaGroup = -10 processValue = value/1 end
  if value >= 10 then dekaGroup = 0 processValue = value/10 end
  if value >= 100 then dekaGroup = 10 processValue = value/100 end
  if value >= 1000 then dekaGroup = 20 processValue = value/1000 end
  if value >= 10000 then dekaGroup = 30 processValue = value/10000 end

  for i, v in ipairs(scalar_uc) do
    if processValue >= v then dekaOffset = i end
  end

  local index = dekaGroup + dekaOffset

  return index
end

function setUCValue()
  local valueIndex = getValue("IndexUC")
  local scalarValue = getScalarValue(valueIndex)
  local inputIndexScalarUC = textInputHash["ScalarUC"]
  self.editInput({index=inputIndexScalarUC-1, label=scalarValue, value=scalarValue, tooltip=scalarValue})
end

function updateCarryAbility()
  local valueSIZ = getValue("SIZ")
  local valueSTR = getValue("STR")

  local valueLift = math.floor(valueSTR/2 + valueSIZ) - 9
  local valueShoulder = math.max(valueSTR, valueSIZ) - 9
  local valueCarry = math.min(valueShoulder, valueSTR) - 3

  local inputIndexCarry = textInputHash["IndexCarry"]
  self.editInput({index=inputIndexCarry-1, label=valueCarry, value=valueCarry})

  local inputIndexShoulder = textInputHash["IndexShoulder"]
  self.editInput({index=inputIndexShoulder-1, label=valueShoulder, value=valueShoulder})

  local inputIndexLift = textInputHash["IndexLift"]
  self.editInput({index=inputIndexLift-1, label=valueLift, value=valueLift})

  local scalarCarry = getScalarValue(valueCarry)
  local inputIndexCarry = textInputHash["ScalarCarry"]
  self.editInput({index=inputIndexCarry-1, label=scalarCarry, value=scalarCarry})

  local scalarShoulder = getScalarValue(valueShoulder)
  local inputIndexShoulder = textInputHash["ScalarShoulder"]
  self.editInput({index=inputIndexShoulder-1, label=scalarShoulder, value=scalarShoulder})

  local scalarLift = getScalarValue(valueLift)
  local inputIndexLift = textInputHash["ScalarLift"]
  self.editInput({index=inputIndexLift-1, label=scalarLift, value=scalarLift})
end

function updateThrowingAbility()
  local valueSTR = getValue("STR")
  local valueSIZ = getValue("SIZ")

  local minValue = valueSIZ - 12

  local valueLob = math.max(valueSTR - 18, minValue - 12)
  local valuePitch = valueLob + 6
  local valueHurl = math.max(valuePitch + 6, valueSTR + math.floor(valueSIZ/2) - 12)

  local inputIndexThrow = textInputHash["IndexLob"]
  self.editInput({index=inputIndexThrow-1, label=valueLob, value=valueLob})

  local inputIndexPitch = textInputHash["IndexPitch"]
  self.editInput({index=inputIndexPitch-1, label=valuePitch, value=valuePitch})

  local inputIndexHurl = textInputHash["IndexHurl"]
  self.editInput({index=inputIndexHurl-1, label=valueHurl, value=valueHurl})

  local scalarLob = getScalarValue(valueLob)
  local inputScalarThrow = textInputHash["ScalarLob"]
  self.editInput({index=inputScalarThrow-1, label=scalarLob, value=scalarLob})

  local scalarShoulder = getScalarValue(valuePitch)
  local inputScalarPitch = textInputHash["ScalarPitch"]
  self.editInput({index=inputScalarPitch-1, label=scalarShoulder, value=scalarShoulder})

  local scalarHurl = getScalarValue(valueHurl)
  local inputScalarHurl = textInputHash["ScalarHurl"]
  self.editInput({index=inputScalarHurl-1, label=scalarHurl, value=scalarHurl})
end

function updateMovementAbility()
  local valueSTR = getValue("STR")
  local valueSIZ = getValue("SIZ")
  local valueREF = getValue("REF")
  local valueStature = getValue("Stature")

  local dmSTR = getDMByValue(valueSTR)
  local dmREF = getDMByValue(valueREF)
  local dmSIZ = getDMByValue(valueSIZ)

  local halfStature = math.floor(valueStature/20)
  local adjMOV = math.floor(dmREF/2 + dmSTR/2 - dmSIZ/2)

  local actualWalk = halfStature + 5 + math.floor(adjMOV/2)
  local actualJog = actualWalk + 3
  local actualRun = actualJog + 3 + adjMOV

  local valueMOV = math.max(actualWalk, actualJog, actualRun)
  local dmMOV = getDMByValue(valueMOV, true);

  local valueMPHWalk = getScalarValue(actualWalk - 12)
  local valueMPHJog = getScalarValue(actualJog - 12)
  local valueMPHRun = getScalarValue(actualRun - 12)

  local scalarWalk = getScalarValue(actualWalk)
  local scalarJog = getScalarValue(actualJog)
  local scalarRun = getScalarValue(actualRun)
  local scalarAgility = math.floor(scalarWalk/10)

  local tooltipMPHWalk = "Can Walk about:\n\n" .. valueMPHWalk .. " MPH\n" .. scalarWalk .. "-feet per 10-seconds"
  local tooltipMPHJog = "Can Jog about:\n\n" .. valueMPHJog .. " MPH\n" .. scalarJog .. "-feet per 10-seconds"
  local tooltipMPHRun = "Can Run about:\n\n" .. valueMPHRun .. " MPH\n" .. scalarRun .. "-feet per 10-seconds"
  local tooltipAgility = "Can quickly move across:\n\n" .. scalarAgility .. " Feet every Move action"

  local inputIndexMOV = textInputHash["MOV"]
  self.editInput({index=inputIndexMOV-1, label=valueMOV, value=valueMOV, tooltip=tooltipMPHRun})

  local inputIndexMOVDM = textInputHash["MOVDM"]
  self.editInput({index=inputIndexMOVDM-1, label=dmMOV, value=dmMOV})

  local inputIndexWalk = textInputHash["IndexWalk"]
  self.editInput({index=inputIndexWalk-1, label=actualWalk, value=actualWalk, font_color={0,0,0}})

  local inputIndexJog = textInputHash["IndexJog"]
  self.editInput({index=inputIndexJog-1, label=actualJog, value=actualJog, font_color={0,0,0}})

  local inputIndexRun = textInputHash["IndexRun"]
  self.editInput({index=inputIndexRun-1, label=actualRun, value=actualRun, font_color={0,0,0}})

  local inputIndexWalk = textInputHash["ScalarWalk"]
  self.editInput({index=inputIndexWalk-1, label=scalarWalk, value=scalarWalk, tooltip=tooltipMPHWalk})

  local inputIndexJog = textInputHash["ScalarJog"]
  self.editInput({index=inputIndexJog-1, label=scalarJog, value=scalarJog, tooltip=tooltipMPHJog})

  local inputIndexRun = textInputHash["ScalarRun"]
  self.editInput({index=inputIndexRun-1, label=scalarRun, value=scalarRun, tooltip=tooltipMPHRun})

  local inputMphRun = textInputHash["ScalarMphRun"]
  self.editInput({index=inputMphRun-1, label=valueMPHRun, value=valueMPHRun, tooltip=tooltipMPHRun})

  local inputAgility = textInputHash["ScalarAgility"]
  self.editInput({index=inputAgility-1, label=scalarAgility, value=scalarAgility, tooltip=tooltipAgility})
end

function updateJumpingAbility()
  local valueFOR = getValue("FOR")
  local valueSIZ = getValue("SIZ")
  local valueSTR = getValue("STR")
  local valueMOV = getValue("MOV")
  local valuePhysicality = math.max(valueSIZ, valueSTR)
  local valueStature = getValue("Stature")

  local valueUp  = math.max(valueMOV - 21, valueSTR - valueSIZ - 6)
  local valueBroad  = math.floor(valueUp + valueStature/10)
  local valueDown  = math.max(valueUp + 3, valueMOV - 12)

  local inputIndexUp = textInputHash["IndexUp"]
  self.editInput({index=inputIndexUp-1, label=valueUp, value=valueUp})

  local inputIndexBroad = textInputHash["IndexBroad"]
  self.editInput({index=inputIndexBroad-1, label=valueBroad, value=valueBroad})

  local inputIndexDown = textInputHash["IndexDown"]
  self.editInput({index=inputIndexDown-1, label=valueDown, value=valueDown})

  local scalarUp = getScalarValue(valueUp)
  local inputIndexUp = textInputHash["ScalarUp"]
  self.editInput({index=inputIndexUp-1, label=scalarUp, value=scalarUp})

  local scalarBroad = getScalarValue(valueBroad)
  local inputIndexBroad = textInputHash["ScalarBroad"]
  self.editInput({index=inputIndexBroad-1, label=scalarBroad, value=scalarBroad})

  local scalarDown = getScalarValue(valueDown)
  local inputIndexDown = textInputHash["ScalarDown"]
  self.editInput({index=inputIndexDown-1, label=scalarDown, value=scalarDown})
end

function middleOfThree(a, b, c)
  if a > b then
    if b > c then
      return b
    elseif a > c then
      return c
    else
      return a
    end
  else
    if a > c then
      return a
    elseif b > c then
      return c
    else
      return b
    end
  end
end

function getDMByValue(value, usePrefix)
  if value == nil or value == "" then return 0 end

  local diff = value - 7
  local magnitude = math.abs(diff)
  local delta = math.floor(magnitude/2 + 0.5)
  local sign = "+"
  local unprefixed = delta

  if diff < 0 then sign = "-" end
  if diff < 0 then unprefixed = -unprefixed end
  if delta == 0 then sign = "+" end
  if usePrefix == true then return sign .. delta end
  return unprefixed
end

function convertValue(given, isNilOnly)
  local value = 0

  if given == nil and isNilOnly == true then return nil end
  if given == nil or given == "" then value = 0 end
  if type(given) == "string" then value = tonumber(given) end

  return value
end

function getValue(attr, isValueOnly)
  if attr == nil then return 0 end
  if type(attr) != "string" then return 0 end

  local indexAttr = textInputHash[attr]

  local rawValue = ref_buttonData.textbox[indexAttr].value
  local labelValue = ref_buttonData.textbox[indexAttr].label
  local convertedRawValue = convertValue(rawValue, isValueOnly)
  local convertedLabelValue = convertValue(labelValue)

  if isValueOnly == true then return convertedRawValue end

  return convertedRawValue or convertedLabelValue
end

function getDegreeOfFear(dmStress)
  if dmStress == nil then return '' end
  if dmStress <= 0 then return '' end
  if dmStress <= 1 then return 'NERVOUS' end
  if dmStress <= 2 then return 'DISORDERED' end
  if dmStress <= 3 then return 'PANICKED' end
  if dmStress <= 9 then return 'BROKEN' end

  return 'DISCOMBOBULATED'
end

function getShowDM(dmValue, actualValue)
  if actualValue != nil and actualValue == 0 then return '' end
  if dmValue == nil or dmValue == 0 then return '' end
  if dmValue < 0 then return "[ff0000]>> suffer DM " .. dmValue .. "D[-]" end

  return "[ff0000]>> suffer DM " .. dmValue .. "D[-]"
end

function updateSIZ()
    local valueSIZ = getValue("SIZ")
    local valueBuild = getValue("Build")
    local computedSIZ = math.floor(0.51 + 10/3*(valueBuild - 10))

    local inputIndex = textInputHash["SIZ"]
    self.editInput({index=inputIndex-1, label=computedSIZ, value=valueSIZ})
end

function updateAttrDM(attr)
  local dmTextInput = attr .. "DM"
  local inputIndex = textInputHash[dmTextInput]

  local valueIndex = textInputHash[attr]
  local valueText = ref_buttonData.textbox[valueIndex].value
  local value = convertValue(valueText)

  if inputIndex then
    local DM = getDMByValue(value, true)
    self.editInput({index=inputIndex-1, label=DM, value=DM})
  end
end

function updateBackName()
  local nameIndex = textInputHash["Name"]
  local backNameIndex = textInputHash["BackName"]
  local valueName = ref_buttonData.textbox[nameIndex].value
  local valueBackName = ref_buttonData.textbox[backNameIndex].value
  self.editInput({index=backNameIndex-1, label=valueBackName, value=valueName})
end

function updateProfileRank()
  local valueStature = getValue("Stature")
  local valueBuild = getValue("Build")
  local profileRank = math.floor(valueStature/2 + valueBuild/2)

  local inputIndex = textInputHash["Profile"]
  self.editInput({index=inputIndex-1, value=profileRank, tooltip=profileRank})
end

function updateHitpoints(value)
  local starCount = getStarCount()

  local valueREF = getValue("REF")
  local valuePOW = getValue("POW")
  local valuePRE = getValue("PRE")
  local valueMOV = getValue("MOV")

  local dmREF = getDMByValue(valueREF)
  local dmPOW = getDMByValue(valuePOW)
  local dmPRE = getDMByValue(valuePRE)
  local dmMOV = getDMByValue(valueMOV)

  local valueHitpoints =  math.max(1, 10 + starCount * 3 + dmREF + dmPOW + dmPRE + dmMOV)
  local originalHitpoints = getValue("Hitpoints", true)

  local inputIndex = textInputHash["Hitpoints"]
  self.editInput({index=inputIndex-1, label=valueHitpoints, value=originalHitpoints})
end

function updateBodypoints()
  local inputIndex = textInputHash["Bodypoints"]

  local valueBuild = getValue("Build")
  local valueSIZ = getValue("SIZ")
  local calcBodypoints = math.max(1, valueSIZ)
  local valueBodypoints = getValue("Bodypoints", true) or calcBodypoints
  local originalBodypoints = getValue("Bodypoints", true)

  self.editInput({index=inputIndex-1, label=valueBodypoints, value=originalBodypoints})
end

function getRecovery()
  local valuePOW = getValue("POW")
  local valueFOR = getValue("FOR")

  local dmPOW = getDMByValue(valuePOW)
  local dmFOR = getDMByValue(valueFOR)

  local sum = dmPOW + dmFOR + 3
  return math.max(1, sum)
end

function updateRecovery()
  local starCount = getStarCount() or 1

  local calcRecovery = getRecovery()
  local valueRecovery = math.floor(starCount/3) + (getValue("Recovery", true) or calcRecovery)
  local originalRecovery = getValue("Recovery", true)

  local inputIndex = textInputHash["Recovery"]
  self.editInput({index=inputIndex-1, label=valueRecovery, value=originalRecovery})
end

function updateResilience()
  local valuePOW = getValue("POW")
  local starCount = getStarCount() or 1

  local valueResilience =  math.floor(starCount/2) + math.floor(2/3*valuePOW + 3)
  local originalResilience = getValue("Resilience", true)

  local inputIndex = textInputHash["Resilience"]
  self.editInput({index=inputIndex-1, label=valueResilience, value=originalResilience})
end

function updateEndurance()
  local valueFOR = getValue("FOR")
  local starCount = getStarCount() or 1

  local valueEndurance =  math.floor(starCount/2) + math.floor(3/3*valueFOR + 3)
  local originalEndurance = getValue("Endurance", true)

  local inputIndex = textInputHash["Endurance"]
  self.editInput({index=inputIndex-1, label=valueEndurance, value=originalEndurance})
end

function updateResistance()
  local valueSIZ = getValue("SIZ")
  local starCount = getStarCount() or 1

  local valueResistance =  math.floor(starCount/2) + math.floor(4/3*valueSIZ + 3)
  local originalResistance = getValue("Resistance", true)

  local inputIndex = textInputHash["Resistance"]
  self.editInput({index=inputIndex-1, label=valueResistance, value=originalResistance})
end

function updateDamage()
  local valueDamage = getValue("Damage")
end

function updateInjury()
  local valueInjury = getValue("Injury")
end

function updateFatigue()
  local valueFatigue = getValue("Fatigue")
  local valueEndurance = getValue("Endurance")

  local dmFatigue = math.floor(valueFatigue/valueEndurance)
  local showDM = getShowDM(-dmFatigue, valueFatigue)
  local tooltipFatigue = TOOLTIP_FATIGUE .. "\n\n" .. showDM
  local originalFatigue = getValue("Fatigue", true)

  local inputIndex = textInputHash["Fatigue"]
  self.editInput({index=inputIndex-1, value=originalFatigue, tooltip=tooltipFatigue})
end

function updateWeariness()
  local valueWeariness = getValue("Weariness")
  local valueEndurance = getValue("Endurance")

  local dmWeariness = math.floor(valueWeariness/valueEndurance)
  local showDM = getShowDM(-dmWeariness, valueWeariness)
  local tooltipWeariness = TOOLTIP_WEARINESS .. "\n\n" .. showDM
  local originalWeariness = getValue("Weariness", true)

  local inputIndex = textInputHash["Weariness"]
  self.editInput({index=inputIndex-1, value=originalWeariness, tooltip=tooltipWeariness})
end

function updateStress()
  local valueStress = getValue("Stress")
  local valueResilience = getValue("Resilience")

  local dmStress = math.floor(valueStress/valueResilience)
  local degreeOfFear = getDegreeOfFear(dmStress)
  local showDM = getShowDM(-dmStress, valueStress)
  local tooltipStress = TOOLTIP_STRESS .. "\n\n" .. showDM .. " > " .. degreeOfFear
  local originalStress = getValue("Stress", true)

  local inputIndex = textInputHash["Stress"]
  self.editInput({index=inputIndex-1, value=originalStress, tooltip=tooltipStress})
end

function updateRads()
  local valueRads = getValue("Rads")
  local valueResistance = getValue("Resistance")

  local dmRads = math.floor(valueRads/valueResistance)
  local showDM = getShowDM(-dmRads, valueRads)
  local tooltipRads = TOOLTIP_RADS .. "\n\n" .. showDM
  local originalRads = getValue("Rads", true)

  local inputIndex = textInputHash["Rads"]
  self.editInput({index=inputIndex-1, value=originalRads, tooltip=tooltipRads})
end

function updateFavorDice()
  local starCount = getValue("CharacterLevel") or 1

  local valueFavorDice = getValue("FavorDice", true) or starCount
  local originalFavorDice = getValue("FavorDice", true)

  local inputIndex = textInputHash["FavorDice"]
  self.editInput({index=inputIndex-1, label=valueFavorDice, value=originalFavorDice})
end

function updateCellburn()
  local valuePRE = getValue("PRE")
  local valueKNO = getValue("KNO")
  local valuePOW = getValue("POW")

  local dmPRE = getDMByValue(valuePRE)
  local dmKNO = getDMByValue(valueKNO)
  local dmPOW = getDMByValue(valuePOW)

  local calcCellburn = math.max(1, 1 + dmPRE + dmKNO + dmPOW)
  local valueCellburn = getValue("Cellburn", true) or calcCellburn
  local originalCellburn = getValue("Cellburn", true)

  local inputIndex = textInputHash["Cellburn"]
  self.editInput({index=inputIndex-1, label=valueCellburn, value=originalCellburn})
end

function updateManapool()
  local valueZED = getValue("ZED")
  local valueSIZ = getValue("SIZ")

  local dmSIZ = getDMByValue(valueSIZ)

  local calcManapool = math.max(0, valueZED + dmSIZ)
  local valueManapool = getValue("Manapool", true) or calcManapool
  local originalManapool = getValue("Manapool", true)

  local inputIndex = textInputHash["Manapool"]
  self.editInput({index=inputIndex-1, label=valueManapool, value=originalManapool})
end

function updateHastyActions()
  local valueREF = getValue("REF")
  local dmREF = getDMByValue(valueREF)
  local calcHastyActions = "+" .. math.max(0, math.floor(dmREF/3))

  local inputIndex = textInputHash["HastyActions"]
  self.editInput({index=inputIndex-1, label=calcHastyActions, value=calcHastyActions}) 
end

function updateMeleeAttack() 
  local valueCCA = getValue("CCA")
  local calcMeleeAttack = getDMByValue(valueCCA, true)

  local inputIndex = textInputHash["MeleeAttack"]
  self.editInput({index=inputIndex-1, label=calcMeleeAttack, value=calcMeleeAttack}) 
end

function updateMeleeDefend() 
  local valueCCA = getValue("CCA")
  local calcMeleeDefend = getDMByValue(valueCCA, true)

  local inputIndex = textInputHash["MeleeDefend"]
  self.editInput({index=inputIndex-1, label=calcMeleeDefend, value=calcMeleeDefend}) 
end

function updateRangeAttack() 
  local valueRCA = getValue("RCA")
  local calcRangeAttack = getDMByValue(valueRCA, true)

  local inputIndex = textInputHash["RangeAttack"]
  self.editInput({index=inputIndex-1, label=calcRangeAttack, value=calcRangeAttack}) 
end

function updateRangeDefend() 
  local valueREF = getValue("REF")
  local calcRangeDefend = getDMByValue(valueREF, true)

  local inputIndex = textInputHash["RangeDefend"]
  self.editInput({index=inputIndex-1, label=calcRangeDefend, value=calcRangeDefend}) 
end

function updateMaxAdvantage() 
  local starCount = getStarCount()
  local calcMaxAdvantage = math.floor((starCount - 1)/3) + 1
  local sign = "+"
  local maxAdvantage = sign .. calcMaxAdvantage
  
  local inputIndex = textInputHash["MaxAdvantage"]
  self.editInput({index=inputIndex-1, label=maxAdvantage, value=maxAdvantage}) 
end

--Dud function for if you have a background on a counter
function click_none() end



--Button creation



--Makes checkboxes
function createCheckbox()
    for i, data in ipairs(ref_buttonData.checkbox) do
        --Sets up reference function
        local buttonNumber = spawnedButtonCount
        local funcName = "checkbox"..i
        local func = function() click_checkbox(i, buttonNumber, data.attr) end
        if data.attr then checkboxInputHash[data.attr] = i end

        self.setVar(funcName, func)
        --Sets up label
        local label = ""
        if data.state==true then label=string.char(10008) end
        --Creates button and counts it
        self.createButton({
            attr          = data.attr,
            label         = label,
            click_function= funcName,
            function_owner= self,
            position      = data.pos,
            height        = data.size,
            width         = data.size,
            font_size     = data.size,
            scale         = buttonScale,
            color         = buttonColor,
            font_color    = buttonFontColor,
            tooltip       = data.tooltip
        })
        spawnedButtonCount = spawnedButtonCount + 1
    end
end

--Makes counters
function createCounter()
    for i, data in ipairs(ref_buttonData.counter) do
        --Sets up display
        local displayNumber = spawnedButtonCount
        --Sets up label
        local label = data.value
        --Sets height/width for display
        local size = data.size
        if data.hideBG == true then size = 0 end
        if data.attr then counterInputHash[data.attr] = i end

        --Creates button and counts it
        self.createButton({
            attr            = data.attr,
            label           = label,
            click_function  = "click_none",
            function_owner  = self,
            position        = data.pos,
            height          = size,
            width           = size,
            font_size       = data.size,
            scale           = buttonScale,
            color           = buttonColor,
            font_color      = buttonFontColor,
            tooltip         = data.tooltip
        })
        spawnedButtonCount = spawnedButtonCount + 1

        --Sets up add 1
        local funcName = "counterAdd"..i
        local func = function() click_counter(i, displayNumber, 1, data.attr) end
        self.setVar(funcName, func)

        --Sets up label
        local label = "+"

        --Sets up position
        local offsetDistance = (data.size/2 + data.size/4) * (buttonScale[1] * 0.002)
        local pos = {data.pos[1] + offsetDistance, data.pos[2], data.pos[3]}

        --Sets up size
        local size = data.size / 2

        --Creates button and counts it
        self.createButton({
            label           = label,
            click_function  = funcName,
            function_owner  = self,
            position        = pos,
            height          = size,
            width           = size,
            font_size       = size,
            scale           = buttonScale,
            color           = buttonColor,
            font_color      = buttonFontColor
        })
        spawnedButtonCount = spawnedButtonCount + 1

        --Sets up subtract 1
        local funcName = "counterSub"..i
        local func = function() click_counter(i, displayNumber, -1, data.attr) end
        self.setVar(funcName, func)

        --Sets up label
        local label = "-"

        --Set up position
        local pos = {data.pos[1] - offsetDistance, data.pos[2], data.pos[3]}

        --Creates button and counts it
        self.createButton({
            label           = label,
            click_function  = funcName,
            function_owner  = self,
            position        = pos,
            height          = size,
            width           = size,
            font_size       = size,
            scale           = buttonScale,
            color           = buttonColor,
            font_color      = buttonFontColor
        })

        spawnedButtonCount = spawnedButtonCount + 1
    end
end

function createTextbox()
    for i, data in ipairs(ref_buttonData.textbox) do
        --Sets up reference function
        local funcName = "textbox"..i
        local func = function(_,_,val,sel) click_textbox(i,val,sel, data.attr) end
        if data.attr then textInputHash[data.attr] = i end
        self.setVar(funcName, func)

        self.createInput({
            input_function = funcName,
            function_owner = self,
            label          = data.label,
            alignment      = data.alignment,
            position       = data.pos,
            rotation       = data.rotation or rotationNormal,
            scale          = data.scale or buttonScale,
            width          = data.width,
            height         = data.height or (data.font_size*data.rows),
            font_size      = data.font_size,
            color          = data.color or buttonColor,
            font_color     = data.font_color or buttonFontColor,
            value          = data.value,
            validation     = data.validation or 1,
            tab            = data.tab or 2,
            tooltip        = data.tooltip
        })
    end
end
