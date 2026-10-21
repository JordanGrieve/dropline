package com.jordangrieve.dropline.demo;

/** The shape of a 200 from POST /api/demo/simulate. Mirrors SimulationResult in frontend/src/types.ts. */
public record SimulationResult(int buyers, int sold, int soldOut, int notOpen, int failed, int remaining) {}
