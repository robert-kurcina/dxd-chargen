'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  ATTRIBUTES,
  SKILLS,
  type Attribute,
} from '@/lib/character-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icons } from '@/components/icons';

type AttributesState = Record<Attribute, number>;

const initialAttributes: AttributesState = (Object.keys(ATTRIBUTES) as Attribute[]).reduce(
  (acc, key) => {
    acc[key] = 5;
    return acc;
  },
  {} as AttributesState
);

export default function CharacterForgePage() {
  const [attributes, setAttributes] = useState<AttributesState>(initialAttributes);
  const [isGenerating, startAttributeTransition] = useTransition();
  const [key, setKey] = useState(0);

  const handleGenerateAttributes = () => {
    startAttributeTransition(() => {
      const newAttributes = { ...attributes };
      for (const attr in newAttributes) {
        newAttributes[attr as Attribute] = Math.floor(Math.random() * 10) + 1;
      }
      setAttributes(newAttributes);
      setKey(prev => prev + 1); // For re-triggering animations
    });
  };

  useEffect(() => {
    handleGenerateAttributes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const derivedData = useMemo(() => {
    const skills = Object.entries(SKILLS).reduce((acc, [skill, { attribute }]) => {
      acc[skill] = Math.floor(attributes[attribute] / 2);
      return acc;
    }, {} as Record<string, number>);

    return { skills };
  }, [attributes]);

  return (
    <div className="min-h-screen w-full bg-background font-body">
      <header className="text-center py-16 md:py-20">
        <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary drop-shadow-md">
          Sarna Len Character Forge
        </h1>
        <p className="mt-4 text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto">
          Forge your next RPG character with a dash of randomness.
        </p>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-center mb-8">
          <Button size="lg" onClick={handleGenerateAttributes} disabled={isGenerating}>
            {isGenerating ? (
              <Icons.Loader className="animate-spin" />
            ) : (
              <Icons.Dices />
            )}
            Generate Attributes
          </Button>
        </div>

        <div className="space-y-8">
            <Card className="overflow-hidden shadow-lg" key={`attributes-${key}`}>
              <CardHeader>
                <CardTitle className="font-headline text-3xl">Attributes</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {(Object.keys(ATTRIBUTES) as Attribute[]).map(attr => (
                  <div
                    key={attr}
                    className="flex items-center space-x-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
                  >
                    <div className="p-3 bg-secondary rounded-lg">
                      {React.createElement(Icons[ATTRIBUTES[attr]], { className: 'h-6 w-6 text-primary' })}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{ATTRIBUTES[attr]}</p>
                      <p className="font-headline text-4xl font-semibold text-muted-foreground">{attributes[attr]}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="overflow-hidden shadow-lg" key={`skills-${key}`}>
              <CardHeader>
                <CardTitle className="font-headline text-3xl">Skills</CardTitle>
                <CardDescription>Derived from your attributes (Attribute / 2)</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                {Object.entries(derivedData.skills).map(([skill, value]) => (
                  <div key={skill} className="flex justify-between items-baseline animate-in fade-in-50 slide-in-from-bottom-2 duration-700">
                    <span className="text-foreground/90">{skill}</span>
                    <span className="font-bold text-lg text-primary">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
