
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

#define MAX_PAGES 100
#define MAX_FRAMES 20

int main(int argc, char *argv[]) {
    if (argc != 4) {
        printf("{\"error\":\"Invalid arguments\"}");
        return 1;
    }

    char *algorithm = argv[1];
    char *input = argv[2];
    int capacity = atoi(argv[3]);

    if (capacity < 1 || capacity > MAX_FRAMES) {
        printf("{\"error\":\"Invalid frame count\"}");
        return 1;
    }

    int pages[MAX_PAGES], count = 0;
    char *token = strtok(input, ",");

    while (token && count < MAX_PAGES) {
        pages[count++] = atoi(token);
        token = strtok(NULL, ",");
    }

    int frames[MAX_FRAMES];
    int frequency[MAX_FRAMES] = {0};
    int lastUsed[MAX_FRAMES] = {0};
    int inserted[MAX_FRAMES] = {0};

    for (int i = 0; i < capacity; i++)
        frames[i] = -1;

    int faults = 0, hits = 0;
    int fifoPointer = 0;

    printf("{\"algorithm\":\"%s\",\"steps\":[", algorithm);

    for (int i = 0; i < count; i++) {
        int page = pages[i];
        int found = -1;

        for (int j = 0; j < capacity; j++) {
            if (frames[j] == page) {
                found = j;
                break;
            }
        }

        int isHit = (found != -1);

        if (isHit) {
            hits++;
            frequency[found]++;
            lastUsed[found] = i;
        } else {
            faults++;

            int empty = -1;

            for (int j = 0; j < capacity; j++) {
                if (frames[j] == -1) {
                    empty = j;
                    break;
                }
            }

            int victim = empty;

            if (empty == -1) {
                if (strcmp(algorithm, "FIFO") == 0) {
                    victim = fifoPointer;
                    fifoPointer = (fifoPointer + 1) % capacity;
                } 
                else if (strcmp(algorithm, "LRU") == 0) {
                    victim = 0;
                    for (int j = 1; j < capacity; j++)
                        if (lastUsed[j] < lastUsed[victim])
                            victim = j;
                }
                else if (strcmp(algorithm, "LFU") == 0) {
                    victim = 0;
                    for (int j = 1; j < capacity; j++)
                        if (frequency[j] < frequency[victim])
                            victim = j;
                }
                else {
                    victim = 0;
                    double lowest = 1e9;

                    for (int j = 0; j < capacity; j++) {
                        int age = i - lastUsed[j];
                        double score = (double)frequency[j] /
                                       (age + 1);

                        if (score < lowest) {
                            lowest = score;
                            victim = j;
                        }
                    }
                }
            }

            frames[victim] = page;
            frequency[victim] = 1;
            lastUsed[victim] = i;
        }

        if (i > 0) printf(",");

        printf("{\"page\":%d,\"hit\":%s,\"frames\":[",
               page, isHit ? "true" : "false");

        for (int j = 0; j < capacity; j++) {
            if (j > 0) printf(",");
            if (frames[j] == -1)
                printf("null");
            else
                printf("%d", frames[j]);
        }

        printf("]}");
    }

    printf("],\"hits\":%d,\"faults\":%d,\"total\":%d}",
           hits, faults, count);

    return 0;
}
